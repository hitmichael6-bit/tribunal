import type { RepresentativeResult } from '../types';

export function RepresentativeCard({ result, loading }: { result?: RepresentativeResult; loading: boolean }) {
  if (loading && !result) {
    return (
      <div className="card card--loading">
        <div className="card__loading-spinner" aria-hidden />
        <p>Preparing submission…</p>
      </div>
    );
  }

  if (!result) return null;

  return (
    <article className={`card card--representative card--${result.seat}`}>
      <header className="card__header">
        <h3>{result.name}</h3>
        <span className={`badge badge--seat-${result.seat}`}>{result.seat}</span>
      </header>

      {result.status === 'success' ? (
        <p className="card__body">{result.argumentText}</p>
      ) : (
        <p className="card__error" role="alert">
          Call failed — no submission generated. {result.error && <span>({result.error})</span>}
        </p>
      )}
    </article>
  );
}
