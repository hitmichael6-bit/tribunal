import { useEffect, useState } from 'react';
import { CHARGE_SHEET } from './chargeSheetContent';
import { ChargeSheet } from './components/ChargeSheet';
import { RepresentativeCard } from './components/RepresentativeCard';
import { JudgeCard } from './components/JudgeCard';
import { CallLogTable } from './components/CallLogTable';
import { RunHistory } from './components/RunHistory';
import { JUDGE_ROLES, REPRESENTATIVE_ROLES, createTrial, getTrial, listTrials, runJudge, runRepresentative } from './api';
import type { CallLogEntry, JudgeResult, RepresentativeResult, TrialRunSummary } from './types';

type Phase = 'idle' | 'representatives' | 'judges' | 'done' | 'error';

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
      .catch(() => {
        /* history list is a nice-to-have; failing silently here is fine, it just stays empty */
      });
  }

  useEffect(() => {
    refreshHistory();
  }, []);

  async function handleRunTrial() {
    setViewingPastId(null);
    setErrorMessage(null);
    setRepresentatives([]);
    setJudges([]);
    setCallLog([]);
    setPhase('representatives');

    try {
      const created = await createTrial();
      setTrialId(created.id);

      // Fire all 4 representative calls in parallel, as separate backend
      // requests — each card flips from loading to its result as soon as
      // its own call resolves, independent of the others.
      await Promise.all(
        REPRESENTATIVE_ROLES.map(async (role) => {
          const result = await runRepresentative(created.id, role);
          setRepresentatives((prev) => [...prev, result]);
        })
      );

      setPhase('judges');
      // Same pattern for the 3 judges — fired independently, each rendered
      // the moment its own ruling comes back. Never awaited/combined into a
      // single verdict.
      await Promise.all(
        JUDGE_ROLES.map(async (role) => {
          const result = await runJudge(created.id, role);
          setJudges((prev) => [...prev, result]);
        })
      );

      setPhase('done');
      refreshHistory();

      const detail = await getTrial(created.id);
      setCallLog(detail.callLog);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Something went wrong running the trial.');
      setPhase('error');
    }
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
