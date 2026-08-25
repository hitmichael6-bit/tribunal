import type { ChargeSheet, JudgeResult, RepresentativeResult, TrialRunDetail, TrialRunSummary } from './types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  if (!response.ok) {
    let message = `Request to ${path} failed with ${response.status}`;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore — use default message
    }
    throw new Error(message);
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
export const REPRESENTATIVE_ROLES = ['jon_snow', 'tyrion', 'daenerys', 'grey_worm'] as const;
export const JUDGE_ROLES = ['judge_barak', 'judge_elon', 'judge_shamgar'] as const;

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
