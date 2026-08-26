import type { HandlerEvent } from '@netlify/functions';
import type { AgentRole } from './types';

const ROLE_NAMES: AgentRole[] = ['jon_snow', 'tyrion', 'daenerys', 'grey_worm', 'judge_barak', 'judge_elon', 'judge_shamgar'];
const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

// Reads the trial id / role from wherever the request actually carries it.
// Prefers query string params (works when hitting a function URL directly,
// e.g. during local `netlify dev`), falling back to parsing the request
// path (needed for the deployed rewrite rules in netlify.toml, which
// forward these as path segments rather than a query string — path-segment
// placeholder forwarding is Netlify's clearly documented, confirmed-working
// pattern; query-string forwarding via a rewrite is not). Checking both
// makes this correct regardless of which shape Netlify hands us.
export function extractTrialId(event: HandlerEvent): string | undefined {
  const fromQuery = event.queryStringParameters?.id;
  if (fromQuery) return fromQuery;
  return event.path?.match(UUID_PATTERN)?.[0];
}

export function extractRole(event: HandlerEvent): string | undefined {
  const fromQuery = event.queryStringParameters?.role;
  if (fromQuery) return fromQuery;
  const path = event.path || '';
  return ROLE_NAMES.find((role) => path.includes(role));
}
