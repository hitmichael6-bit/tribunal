import type { TrialRunSummary } from '../types';

// A run stuck in 'running' or 'representatives_complete' isn't necessarily
// still active — it never gets a further status update if every call
// failed (nothing succeeds to trigger the next update) or if the browser
// was closed/reloaded mid-phase. Past this age, treat it as abandoned
// rather than claim it's still "in progress" when nothing will ever
// resume it.
const STALL_THRESHOLD_MS = 2 * 60 * 1000;

function describeRun(run: TrialRunSummary): { label: string; tone: 'progress' | 'success' | 'failure' } {
  if (run.status === 'completed') {
    // "completed" only means the run reached the end, not that every call
    // inside it succeeded.
    return run.hadFailures ? { label: 'Completed — some calls failed', tone: 'failure' } : { label: 'Completed', tone: 'success' };
  }

  // Not completed. If we already know a call in it failed, it's not "in
  // progress" — that call isn't retrying itself, this run is done for.
  if (run.hadFailures) {
    return { label: 'Stalled — some calls failed', tone: 'failure' };
  }

  const elapsedMs = Date.now() - new Date(run.started_at).getTime();
  if (elapsedMs > STALL_THRESHOLD_MS) {
    return run.status === 'running'
      ? { label: 'Interrupted before any calls finished', tone: 'failure' }
      : { label: 'Interrupted — judges never ran', tone: 'failure' };
  }

  return run.status === 'running' ? { label: 'In progress…', tone: 'progress' } : { label: 'Judges pending…', tone: 'progress' };
}

export function RunHistory({
  runs,
  onSelect,
  activeId,
}: {
  runs: TrialRunSummary[];
  onSelect: (id: string) => void;
  activeId?: string;
}) {
  if (runs.length === 0) {
    return <p className="run-history__empty">No past runs yet.</p>;
  }

  return (
    <ul className="run-history__list">
      {runs.map((run) => {
        const { label, tone } = describeRun(run);
        return (
          <li key={run.id}>
            <button
              className={run.id === activeId ? 'run-history__item run-history__item--active' : 'run-history__item'}
              onClick={() => onSelect(run.id)}
            >
              <span>
                {new Date(run.started_at).toLocaleString('en-GB', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false,
                })}
              </span>
              <span className={`badge badge--status-${tone}`}>{label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
