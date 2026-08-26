import type { Handler } from '@netlify/functions';
import { supabase } from './lib/supabase';
import { getModelForRole } from './lib/models';
import { callOpenRouter } from './lib/openrouter';
import { getCost } from './lib/pricing';
import { JUDGES, REPRESENTATIVES } from './lib/prompts';
import { buildJudgeUserPrompt } from './lib/prompts/shared';
import { parseJudgeResponse } from './lib/parseJudgeResponse';
import { safeHandler } from './lib/safeHandler';
import { extractTrialId, extractRole } from './lib/extractParams';
import type { JudgeResult, RepresentativeResult } from './lib/types';

// POST /api/trials/:id/judges/:role
// Runs exactly one judge's ruling, independent of the other two (same
// one-call-per-invocation reasoning as representative.ts — see its
// comment). This function must never look at or reference another judge's
// output; it never computes or persists anything that combines rulings.
export const handler: Handler = safeHandler(async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const trialId = extractTrialId(event);
  const role = extractRole(event);
  if (!trialId || !role) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing trial id or role' }) };
  }

  const judge = JUDGES.find((j) => j.role === role);
  if (!judge) {
    return { statusCode: 400, body: JSON.stringify({ error: `Unknown judge role: ${role}` }) };
  }

  const { data: opinionRows, error: fetchError } = await supabase
    .from('representative_opinions')
    .select('representative_role, representative_name, seat, argument_text')
    .eq('trial_run_id', trialId);

  if (fetchError) {
    return { statusCode: 500, body: JSON.stringify({ error: `Failed to load representative opinions: ${fetchError.message}` }) };
  }

  // Reconstruct the full 4-seat picture: any representative with no row
  // persisted (their call failed in the previous phase) is passed to the
  // judge as an explicit, visible failure — never silently dropped.
  const representativeResults: RepresentativeResult[] = REPRESENTATIVES.map((rep) => {
    const row = opinionRows?.find((r) => r.representative_role === rep.role);
    if (row) {
      return { role: rep.role, name: rep.name, seat: rep.seat, status: 'success', argumentText: row.argument_text };
    }
    return { role: rep.role, name: rep.name, seat: rep.seat, status: 'failure', error: 'No submission on record for this representative.' };
  });

  const userPrompt = buildJudgeUserPrompt(representativeResults);
  const model = getModelForRole(judge.role);
  // ~400-600 words requested plus the VERDICT line; 1600 tokens gives real
  // headroom (this model tends to run long) without letting generation run
  // away. Safe as a single-call invocation — measured latency for one call
  // at this length is well within limits.
  const result = await callOpenRouter({ model, systemPrompt: judge.systemPrompt, userPrompt, maxTokens: 1600 });
  const timestamp = new Date().toISOString();

  if (result.status === 'failure' || !result.content || !result.usage) {
    await supabase.from('api_call_logs').insert({
      trial_run_id: trialId,
      agent_role: judge.role,
      model_used: model,
      prompt_tokens: null,
      completion_tokens: null,
      total_tokens: null,
      cost: null,
      status: 'failure',
      error_message: result.errorMessage || 'Unknown failure',
      timestamp,
    });
    const failed: JudgeResult = { role: judge.role, name: judge.name, status: 'failure', error: result.errorMessage };
    return { statusCode: 200, body: JSON.stringify(failed) };
  }

  const parsed = parseJudgeResponse(result.content);
  const cost = await getCost(model, result.usage.promptTokens, result.usage.completionTokens);

  if (!parsed) {
    await supabase.from('api_call_logs').insert({
      trial_run_id: trialId,
      agent_role: judge.role,
      model_used: model,
      prompt_tokens: result.usage.promptTokens,
      completion_tokens: result.usage.completionTokens,
      total_tokens: result.usage.totalTokens,
      cost,
      status: 'failure',
      error_message: 'Model response did not contain a parseable VERDICT line.',
      timestamp,
    });
    const failed: JudgeResult = { role: judge.role, name: judge.name, status: 'failure', error: "Could not parse a verdict from this judge's response." };
    return { statusCode: 200, body: JSON.stringify(failed) };
  }

  const { error: insertRulingError } = await supabase.from('judge_rulings').insert({
    trial_run_id: trialId,
    judge_role: judge.role,
    judge_name: judge.name,
    verdict: parsed.verdict,
    reasoning_text: parsed.reasoningText,
    model_used: model,
  });

  await supabase.from('api_call_logs').insert({
    trial_run_id: trialId,
    agent_role: judge.role,
    model_used: model,
    prompt_tokens: result.usage.promptTokens,
    completion_tokens: result.usage.completionTokens,
    total_tokens: result.usage.totalTokens,
    cost,
    status: insertRulingError ? 'failure' : 'success',
    error_message: insertRulingError ? `Ruled but failed to persist: ${insertRulingError.message}` : null,
    timestamp,
  });

  if (insertRulingError) {
    const failed: JudgeResult = { role: judge.role, name: judge.name, status: 'failure', error: insertRulingError.message };
    return { statusCode: 200, body: JSON.stringify(failed) };
  }

  // Best-effort, idempotent — harmless if all 3 calls race to set this.
  await supabase.from('trial_runs').update({ status: 'completed' }).eq('id', trialId);

  const success: JudgeResult = { role: judge.role, name: judge.name, status: 'success', verdict: parsed.verdict, reasoningText: parsed.reasoningText };
  return { statusCode: 200, body: JSON.stringify(success) };
});
