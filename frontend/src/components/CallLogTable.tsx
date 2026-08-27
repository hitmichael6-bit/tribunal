import type { CallLogEntry } from '../types';

function formatCost(cost: number | null): string {
  if (cost === null) return '—';
  if (cost === 0) return '$0.00';
  return `$${cost < 0.01 ? cost.toFixed(6) : cost.toFixed(4)}`;
}

function formatAgentRole(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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
          <colgroup>
            <col className="col-agent" />
            <col className="col-model" />
            <col className="col-tokens" />
            <col className="col-cost" />
            <col className="col-status" />
            <col className="col-time" />
          </colgroup>
          <thead>
            <tr>
              <th>Agent</th>
              <th>Model</th>
              <th>Tokens</th>
              <th>Cost</th>
              <th>Status</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => (
              <tr key={i} className={entry.status === 'failure' ? 'row--failure' : undefined}>
                <td>{formatAgentRole(entry.agent_role)}</td>
                <td className="call-log__model" title={entry.model_used}>
                  {entry.model_used}
                </td>
                <td>
                  {entry.total_tokens !== null ? (
                    <>
                      <div className="call-log__tokens-total">{entry.total_tokens.toLocaleString()}</div>
                      <div className="call-log__tokens-breakdown">
                        {(entry.prompt_tokens ?? 0).toLocaleString()} in / {(entry.completion_tokens ?? 0).toLocaleString()} out
                      </div>
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="call-log__cost">{formatCost(entry.cost)}</td>
                <td>
                  <span className={`badge badge--status-${entry.status}`}>{entry.status}</span>
                  {entry.error_message && <div className="call-log__error">{entry.error_message}</div>}
                </td>
                <td className="call-log__time">
                  {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>Total</td>
              <td>{totalTokens.toLocaleString()}</td>
              <td className="call-log__cost">{formatCost(totalCost)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
