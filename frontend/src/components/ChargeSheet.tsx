import type { ChargeSheet as ChargeSheetType } from '../types';

export function ChargeSheet({ sheet }: { sheet: ChargeSheetType }) {
  return (
    <section className="charge-sheet">
      <h1>
        Case {sheet.id}: The Realm v. {sheet.accused}
      </h1>
      <dl className="charge-sheet__meta">
        <div>
          <dt>Accused</dt>
          <dd>{sheet.accused}</dd>
        </div>
        <div>
          <dt>Deceased</dt>
          <dd>{sheet.deceased}</dd>
        </div>
      </dl>
      <p className="charge-sheet__act">{sheet.actAlleged}</p>

      <details open>
        <summary>Background</summary>
        {sheet.background.split('\n\n').map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </details>

      <details open>
        <summary>Agreed factual record (stipulated facts)</summary>
        <ol>
          {sheet.stipulatedFacts.map((fact, i) => (
            <li key={i}>{fact}</li>
          ))}
        </ol>
      </details>

      <div className="charge-sheet__question">
        <h2>Question for judgment</h2>
        <p>{sheet.questionForJudgment}</p>
      </div>

      <p className="charge-sheet__scope">{sheet.scopeNote}</p>
    </section>
  );
}
