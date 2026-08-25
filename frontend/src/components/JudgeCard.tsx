import type { JudgeResult } from '../types';

export function JudgeCard({ result, loading }: { result?: JudgeResult; loading: boolean }) {
  if (loading && !result) {
    return (
      <div className="card card--loading">
        <div className="card__loading-spinner" aria-hidden />
        <p>Deliberating…</p>
      </div>
    );
  }

  if (!result) return null;

  return (
    <article className="card card--judge">
      <header className="card__header">
        <h3>{result.name}</h3>
        {result.status === 'success' && result.verdict && (
          <span className={`badge badge--verdict-${result.verdict === 'justified' ? 'justified' : 'not-justified'}`}>
            {result.verdict.toUpperCase()}
          </span>
        )}
      </header>

      {result.status === 'success' ? (
        <p className="card__body">{result.reasoningText}</p>
      ) : (
        <p className="card__error" role="alert">
          Call failed — no ruling produced. {result.error && <span>({result.error})</span>}
        </p>
      )}
    </article>
  );
}
