import type { Verdict } from './types';

const VERDICT_LINE = /VERDICT:\s*(not justified|justified)/i;

// Parses the model's raw response into {verdict, reasoningText}. If no valid
// verdict line is found, returns null — the caller must treat this as a
// visible failure, never guess or fabricate a verdict.
export function parseJudgeResponse(raw: string): { verdict: Verdict; reasoningText: string } | null {
  const match = raw.match(VERDICT_LINE);
  if (!match) return null;

  const verdict = match[1].toLowerCase() as Verdict;
  const reasoningText = raw.replace(match[0], '').trim();
  if (!reasoningText) return null;

  return { verdict, reasoningText };
}
