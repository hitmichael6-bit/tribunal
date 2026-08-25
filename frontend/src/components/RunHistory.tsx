import type { TrialRunSummary } from '../types';

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
      {runs.map((run) => (
        <li key={run.id}>
          <button
            className={run.id === activeId ? 'run-history__item run-history__item--active' : 'run-history__item'}
            onClick={() => onSelect(run.id)}
          >
            <span>{new Date(run.started_at).toLocaleString()}</span>
            <span className={`badge badge--status-${run.status === 'completed' ? 'success' : 'failure'}`}>{run.status}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
