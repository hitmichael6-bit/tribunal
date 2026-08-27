import type { ChargeSheet, JudgeResult, RepresentativeResult, Seat, TrialRunDetail, TrialRunSummary } from './types';

// Error thrown by request() for any non-2xx response; carries the HTTP
// status so callers can special-case (e.g. treat 401 differently from a
// transient 500).
export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

// Optional shared-secret sent with every API call. Set at build time via
// VITE_TRIBUNAL_ACCESS_KEY; the functions check for the matching header and
// 401 without it. Unset (local dev, or if you don't use the gate) means no
// header is sent and the functions don't require one — behaviour unchanged.
const ACCESS_KEY = import.meta.env.VITE_TRIBUNAL_ACCESS_KEY;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (ACCESS_KEY) headers.set('X-Tribunal-Key', ACCESS_KEY);
  const response = await fetch(path, { ...init, headers });
  if (!response.ok) {
    // 401 means the API access gate is on and this request didn't satisfy
    // it. A correctly configured deployment never shows this to a browser
    // user (the frontend always sends the header) — it means the build and
    // the functions disagree on VITE_TRIBUNAL_ACCESS_KEY, or it's set on one
    // side only. Say so plainly instead of a bare "Unauthorized".
    if (response.status === 401) {
      throw new ApiError(
        ACCESS_KEY
          ? 'Access denied (401). This deployment’s access key doesn’t match the one the server expects — make VITE_TRIBUNAL_ACCESS_KEY identical in the build and function environments, then redeploy.'
          : 'Access denied (401). This deployment requires an access key but the frontend was built without one — set VITE_TRIBUNAL_ACCESS_KEY in the site environment and redeploy.',
        401,
      );
    }
    let message = `Request to ${path} failed with ${response.status}`;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore — use default message
    }
    throw new ApiError(message, response.status);
  }
  return response.json();
}

export function createTrial() {
  return request<{ id: string; startedAt: string; status: string; chargeSheet: ChargeSheet }>('/api/trials', {
    method: 'POST',
  });
}

// Each of the 4 representatives / 3 judges is its own backend call, fired in
// parallel from here rather than batched into one request — a single
// backend invocation awaiting several model calls at once risks serverless
// function time limits (confirmed by testing). The backend still owns every
// OpenRouter call and every DB write; this only changes how the fan-out is
// triggered.
//
// Name/seat are mirrored here (they also come back on every successful call)
// so the UI can still render a labelled card for a call that never returned
// a body — a network error, or a slow-call response lost to the function
// timeout. Display order only: 2 defense, 2 prosecution; no weighting.
export const REPRESENTATIVES: { role: string; name: string; seat: Seat }[] = [
  { role: 'jon_snow', name: 'Jon Snow', seat: 'defense' },
  { role: 'tyrion', name: 'Tyrion Lannister', seat: 'defense' },
  { role: 'daenerys', name: 'Daenerys Targaryen', seat: 'prosecution' },
  { role: 'grey_worm', name: 'Grey Worm', seat: 'prosecution' },
];

// Three independent judges. This list is only ever iterated to render or
// fan out calls — never to compute a combined or majority result.
export const JUDGES: { role: string; name: string }[] = [
  { role: 'judge_barak', name: 'Judge 1 — Aharon Barak Model' },
  { role: 'judge_elon', name: 'Judge 2 — Menachem Elon Model' },
  { role: 'judge_shamgar', name: 'Judge 3 — Meir Shamgar Model' },
];

export const REPRESENTATIVE_ROLES = REPRESENTATIVES.map((r) => r.role);
export const JUDGE_ROLES = JUDGES.map((j) => j.role);

export function runRepresentative(trialId: string, role: string) {
  return request<RepresentativeResult>(`/api/trials/${trialId}/representatives/${role}`, {
    method: 'POST',
  });
}

export function runJudge(trialId: string, role: string) {
  return request<JudgeResult>(`/api/trials/${trialId}/judges/${role}`, {
    method: 'POST',
  });
}

export function listTrials() {
  return request<{ runs: TrialRunSummary[] }>('/api/trials');
}

export function getTrial(trialId: string) {
  return request<TrialRunDetail>(`/api/trials/${trialId}`);
}
