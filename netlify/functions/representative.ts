import type { Handler } from '@netlify/functions';
import { supabase } from './lib/supabase';
import { getModelForRole } from './lib/models';
import { callOpenRouter } from './lib/openrouter';
import { getCost } from './lib/pricing';
import { REPRESENTATIVES } from './lib/prompts';
import { buildRepresentativeUserPrompt } from './lib/prompts/shared';
import { safeHandler } from './lib/safeHandler';
import type { RepresentativeResult } from './lib/types';

// POST /api/trials/:id/representatives/:role
// Runs exactly one representative's call. The 4 representatives are fanned
// out as 4 separate function invocations (called in parallel by the
// frontend) rather than one invocation awaiting all 4 internally — measured
// testing showed a single invocation awaiting 4 concurrent OpenRouter calls
// pushes uncomfortably close to serverless function time limits. One call
// per invocation keeps each one fast and independent; the backend still
// owns every OpenRouter call, every log write, and every DB write.
export const handler: Handler = safeHandler(async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const trialId = event.queryStringParameters?.id;
  const role = event.queryStringParameters?.role;
  if (!trialId || !role) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing trial id or role' }) };
  }

  const rep = REPRESENTATIVES.find((r) => r.role === role);
  if (!rep) {
    return { statusCode: 400, body: JSON.stringify({ error: `Unknown representative role: ${role}` }) };
  }

  const model = getModelForRole(rep.role);
  const userPrompt = buildRepresentativeUserPrompt();
  // ~300-500 words requested; 1000 tokens gives real headroom (this model
  // tends to run a bit long) without letting generation run away.
  const result = await callOpenRouter({ model, systemPrompt: rep.systemPrompt, userPrompt, maxTokens: 1000 });
  const timestamp = new Date().toISOString();

  if (result.status === 'failure' || !result.content || !result.usage) {
    await supabase.from('api_call_logs').insert({
      trial_run_id: trialId,
      agent_role: rep.role,
      model_used: model,
      prompt_tokens: null,
      completion_tokens: null,
      total_tokens: null,
      cost: null,
      status: 'failure',
      error_message: result.errorMessage || 'Unknown failure',
      timestamp,
    });
    const failed: RepresentativeResult = { role: rep.role, name: rep.name, seat: rep.seat, status: 'failure', error: result.errorMessage };
    return { statusCode: 200, body: JSON.stringify(failed) };
  }

  const cost = await getCost(model, result.usage.promptTokens, result.usage.completionTokens);

  const { error: insertOpinionError } = await supabase.from('representative_opinions').insert({
    trial_run_id: trialId,
    representative_role: rep.role,
    representative_name: rep.name,
    seat: rep.seat,
    argument_text: result.content,
    model_used: model,
  });

  await supabase.from('api_call_logs').insert({
    trial_run_id: trialId,
    agent_role: rep.role,
    model_used: model,
    prompt_tokens: result.usage.promptTokens,
    completion_tokens: result.usage.completionTokens,
    total_tokens: result.usage.totalTokens,
    cost,
    status: insertOpinionError ? 'failure' : 'success',
    error_message: insertOpinionError ? `Generated but failed to persist: ${insertOpinionError.message}` : null,
    timestamp,
  });

  if (insertOpinionError) {
    const failed: RepresentativeResult = { role: rep.role, name: rep.name, seat: rep.seat, status: 'failure', error: insertOpinionError.message };
    return { statusCode: 200, body: JSON.stringify(failed) };
  }

  // Best-effort, idempotent — harmless if all 4 calls race to set this.
  await supabase.from('trial_runs').update({ status: 'representatives_complete' }).eq('id', trialId);

  const success: RepresentativeResult = { role: rep.role, name: rep.name, seat: rep.seat, status: 'success', argumentText: result.content };
  return { statusCode: 200, body: JSON.stringify(success) };
});
