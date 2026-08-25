import type { TrialRunSummary } from '../types';

function describeRun(run: TrialRunSummary): { label: string; tone: 'progress' | 'success' | 'failure' } {
  if (run.status === 'running') return { label: 'In progress…', tone: 'progress' };
  if (run.status === 'representatives_complete') return { label: 'Judges pending…', tone: 'progress' };
  // status === 'completed' from here — but "completed" only means the run
  // reached the end, not that every call inside it succeeded.
  if (run.hadFailures) return { label: 'Completed — some calls failed', tone: 'failure' };
  return { label: 'Completed', tone: 'success' };
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
              <span>{new Date(run.started_at).toLocaleString()}</span>
              <span className={`badge badge--status-${tone}`}>{label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
