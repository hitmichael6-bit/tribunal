import { useEffect, useState } from 'react';
import { CHARGE_SHEET } from './chargeSheetContent';
import { ChargeSheet } from './components/ChargeSheet';
import { RepresentativeCard } from './components/RepresentativeCard';
import { JudgeCard } from './components/JudgeCard';
import { CallLogTable } from './components/CallLogTable';
import { RunHistory } from './components/RunHistory';
import { ApiError, JUDGES, JUDGE_ROLES, REPRESENTATIVES, REPRESENTATIVE_ROLES, createTrial, getTrial, listTrials, runJudge, runRepresentative } from './api';
import type { CallLogEntry, JudgeResult, RepresentativeResult, TrialRunSummary } from './types';

type Phase = 'idle' | 'representatives' | 'judges' | 'done' | 'error';

// Replace the entry for a role if present, otherwise append. Used so both
// the live call results and the post-phase reconciliation against the DB
// write into the same slot instead of duplicating a card.
function upsertByRole<T extends { role: string }>(list: T[], item: T): T[] {
  const idx = list.findIndex((x) => x.role === item.role);
  if (idx === -1) return [...list, item];
  const next = list.slice();
  next[idx] = item;
  return next;
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [trialId, setTrialId] = useState<string | null>(null);
  const [representatives, setRepresentatives] = useState<RepresentativeResult[]>([]);
  const [judges, setJudges] = useState<JudgeResult[]>([]);
  const [callLog, setCallLog] = useState<CallLogEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<TrialRunSummary[]>([]);
  const [viewingPastId, setViewingPastId] = useState<string | null>(null);

  function refreshHistory() {
    listTrials()
      .then((res) => setHistory(res.runs))
      .catch((err: unknown) => {
        // The history list is a nice-to-have — stay silent on transient
        // errors, it just stays empty. But a 401 means the whole API is
        // gated off from this build; surface that on load rather than
        // letting the app look merely empty until the user clicks Run.
        if (err instanceof ApiError && err.status === 401) {
          setErrorMessage(err.message);
        }
      });
  }

  useEffect(() => {
    refreshHistory();
  }, []);

  // Pull the run's persisted state and let it override what the live calls
  // produced. A slow representative or judge call can commit its result to
  // the DB and still have its HTTP response lost to the function timeout —
  // surfacing here as a failed request for a result that actually exists.
  // The DB is the source of truth; the transport outcome is not.
  async function reconcileFromDb(id: string) {
    // Keep whatever the live calls produced if this read fails.
    const detail = await getTrial(id).catch(() => null);
    if (!detail) return;

    setRepresentatives((prev) => {
      let next = prev;
      for (const { role, name, seat } of REPRESENTATIVES) {
        const row = detail.representatives.find((r) => r.representative_role === role);
        if (row) {
          next = upsertByRole(next, { role, name, seat, status: 'success', argumentText: row.argument_text });
        }
      }
      return next;
    });

    setJudges((prev) => {
      let next = prev;
      for (const { role, name } of JUDGES) {
        const row = detail.judges.find((j) => j.judge_role === role);
        if (row) {
          next = upsertByRole(next, { role, name, status: 'success', verdict: row.verdict, reasoningText: row.reasoning_text });
        }
      }
      return next;
    });

    setCallLog(detail.callLog);
  }

  async function handleRunTrial() {
    setViewingPastId(null);
    setErrorMessage(null);
    setRepresentatives([]);
    setJudges([]);
    setCallLog([]);
    setPhase('representatives');

    const created = await createTrial().catch((err: any) => {
      setErrorMessage(err?.message || 'Could not start a new trial.');
      setPhase('error');
      return null;
    });
    if (!created) return;
    setTrialId(created.id);
    const id = created.id;

    // Phase 1 — the 4 representatives, each its own backend request, fired
    // in parallel. allSettled (not all): one call failing, or its response
    // being lost to a slow-call timeout, must not stop the others or the
    // judges. A call that never returns a body still gets a labelled
    // failure card from the mirrored name/seat.
    await Promise.allSettled(
      REPRESENTATIVES.map(async ({ role, name, seat }) => {
        try {
          const result = await runRepresentative(id, role);
          setRepresentatives((prev) => upsertByRole(prev, result));
        } catch (err: any) {
          setRepresentatives((prev) =>
            upsertByRole<RepresentativeResult>(prev, { role, name, seat, status: 'failure', error: err?.message || 'Request failed.' }),
          );
        }
      }),
    );
    await reconcileFromDb(id);

    // Phase 2 — the 3 judges. Same discipline. Each judge reads whatever
    // representative opinions persisted (missing ones are passed to it as an
    // explicit "no submission on record"), rules alone, and is rendered on
    // its own. Nothing here combines the three.
    setPhase('judges');
    await Promise.allSettled(
      JUDGES.map(async ({ role, name }) => {
        try {
          const result = await runJudge(id, role);
          setJudges((prev) => upsertByRole(prev, result));
        } catch (err: any) {
          setJudges((prev) =>
            upsertByRole<JudgeResult>(prev, { role, name, status: 'failure', error: err?.message || 'Request failed.' }),
          );
        }
      }),
    );
    await reconcileFromDb(id);

    setPhase('done');
    refreshHistory();
  }

  async function handleSelectPastRun(id: string) {
    setErrorMessage(null);
    setTrialId(null);
    try {
      const detail = await getTrial(id);
      setViewingPastId(id);
      setRepresentatives(
        detail.representatives.map((r) => ({
          role: r.representative_role,
          name: r.representative_name,
          seat: r.seat,
          status: 'success',
          argumentText: r.argument_text,
        }))
      );
      setJudges(
        detail.judges.map((j) => ({
          role: j.judge_role,
          name: j.judge_name,
          status: 'success',
          verdict: j.verdict,
          reasoningText: j.reasoning_text,
        }))
      );
      setCallLog(detail.callLog);
      setPhase('done');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to load that run.');
      setPhase('error');
    }
  }

  const isLive = viewingPastId === null;
  const repsLoading = isLive && phase === 'representatives';
  const judgesLoading = isLive && phase === 'judges';
  const showJudges = judges.length > 0 || judgesLoading || phase === 'judges' || phase === 'done';

  return (
    <div className="app">
      <aside className="sidebar">
        <h2>Past runs</h2>
        <button className="button button--secondary" onClick={handleRunTrial} disabled={phase === 'representatives' || phase === 'judges'}>
          {phase === 'representatives' || phase === 'judges' ? 'Running…' : 'Run trial'}
        </button>
        <RunHistory runs={history} onSelect={handleSelectPastRun} activeId={viewingPastId ?? undefined} />
      </aside>

      <main className="main">
        <ChargeSheet sheet={CHARGE_SHEET} />

        {errorMessage && (
          <div className="banner banner--error" role="alert">
            {errorMessage}
          </div>
        )}

        {viewingPastId && <div className="banner banner--info">Viewing a past run, read-only.</div>}

        {(phase !== 'idle' || representatives.length > 0) && (
          <section className="phase">
            <h2>Representatives</h2>
            <div className="grid grid--representatives">
              {(isLive ? REPRESENTATIVE_ROLES : representatives.map((r) => r.role)).map((role) => (
                <RepresentativeCard
                  key={role}
                  result={representatives.find((r) => r.role === role)}
                  loading={repsLoading && !representatives.some((r) => r.role === role)}
                />
              ))}
            </div>
          </section>
        )}

        {showJudges && (
          <section className="phase">
            <h2>Judges — three independent rulings</h2>
            <p className="phase__note">Each judge rules alone. These are never combined into a single verdict.</p>
            <div className="grid grid--judges">
              {(isLive ? JUDGE_ROLES : judges.map((j) => j.role)).map((role) => (
                <JudgeCard
                  key={role}
                  result={judges.find((j) => j.role === role)}
                  loading={judgesLoading && !judges.some((j) => j.role === role)}
                />
              ))}
            </div>
          </section>
        )}

        <CallLogTable entries={callLog} />
      </main>
    </div>
  );
}
