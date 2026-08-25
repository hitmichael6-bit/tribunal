import { CHARGE_SHEET } from '../chargeSheet';
import type { RepresentativeResult } from '../types';

export function formatChargeSheetBlock(): string {
  const facts = CHARGE_SHEET.stipulatedFacts.map((f, i) => `${i + 1}. ${f}`).join('\n');
  return `CASE ${CHARGE_SHEET.id}: The Realm v. ${CHARGE_SHEET.accused}

Accused: ${CHARGE_SHEET.accused}
Deceased: ${CHARGE_SHEET.deceased}
Act alleged: ${CHARGE_SHEET.actAlleged}

Background:
${CHARGE_SHEET.background}

Agreed factual record (stipulated facts both sides accept as true):
${facts}

Question for judgment:
${CHARGE_SHEET.questionForJudgment}

Scope: this tribunal decides justified / not justified only. It does not impose a sentence.`;
}

// Used for the 4 representative calls. Deliberately contains no instruction
// about which conclusion to reach — only what the tribunal is asking and
// what the representative is expected to produce.
export function buildRepresentativeUserPrompt(): string {
  return `${formatChargeSheetBlock()}

You are addressing the tribunal now. Give your argument on the question for judgment, reasoning as yourself — in your own voice, from your own values and read of the facts above. Speak directly to the tribunal in the first person; do not narrate stage directions or refer to yourself in the third person. Aim for roughly 300-500 words. Do not mention that you are an AI or break character in any way.`;
}

// Used for the 3 judge calls. Includes the charge sheet plus all 4
// representative arguments (whichever of the 4 succeeded), and asks for a
// strict machine-parseable verdict line followed by free-form reasoning.
// Never mentions the other judges — each ruling must be produced with no
// awareness of, or reference to, the other two.
export function buildJudgeUserPrompt(representativeResults: RepresentativeResult[]): string {
  const argumentsBlock = representativeResults
    .map((r) => {
      if (r.status === 'success' && r.argumentText) {
        return `--- ${r.name} (${r.seat}) ---\n${r.argumentText}`;
      }
      return `--- ${r.name} (${r.seat}) ---\n[This representative's submission failed to generate and is not available. Judge only on the record you do have.]`;
    })
    .join('\n\n');

  return `${formatChargeSheetBlock()}

The four representatives have made their submissions to the tribunal:

${argumentsBlock}

You are ruling now, alone, applying your own reasoning method to the question for judgment above. You do not know how any other judge will rule, and your ruling will never be combined with theirs — write as the sole author of this opinion.

Format your response exactly as follows:
- The first line must be exactly: "VERDICT: justified" or "VERDICT: not justified" (choose one, nothing else on that line).
- After that line, give your reasoning in your own voice and method — substantial enough to actually show your reasoning, but disciplined: roughly 400-600 words, not an exhaustive treatise.`;
}
