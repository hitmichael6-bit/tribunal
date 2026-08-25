import type { CallLogEntry } from '../types';

function formatCost(cost: number | null): string {
  if (cost === null) return '—';
  if (cost === 0) return '$0.00';
  return `$${cost < 0.01 ? cost.toFixed(6) : cost.toFixed(4)}`;
}

export function CallLogTable({ entries }: { entries: CallLogEntry[] }) {
  if (entries.length === 0) return null;

  const totalCost = entries.reduce((sum, e) => sum + (e.cost ?? 0), 0);
  const totalTokens = entries.reduce((sum, e) => sum + (e.total_tokens ?? 0), 0);

  return (
    <section className="call-log">
      <h2>Call log</h2>
      <div className="call-log__table-wrap">
        <table>
          <thead>
            <tr>
              <th>Agent</th>
              <th>Model</th>
              <th>Prompt tokens</th>
              <th>Completion tokens</th>
              <th>Total tokens</th>
              <th>Cost</th>
              <th>Status</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => (
              <tr key={i} className={entry.status === 'failure' ? 'row--failure' : undefined}>
                <td>{entry.agent_role}</td>
                <td>{entry.model_used}</td>
                <td>{entry.prompt_tokens ?? '—'}</td>
                <td>{entry.completion_tokens ?? '—'}</td>
                <td>{entry.total_tokens ?? '—'}</td>
                <td>{formatCost(entry.cost)}</td>
                <td>
                  <span className={`badge badge--status-${entry.status}`}>{entry.status}</span>
                  {entry.error_message && <div className="call-log__error">{entry.error_message}</div>}
                </td>
                <td>{new Date(entry.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>Total</td>
              <td>{totalTokens}</td>
              <td>{formatCost(totalCost)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
