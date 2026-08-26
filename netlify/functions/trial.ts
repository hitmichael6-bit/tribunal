import type { Handler } from '@netlify/functions';
import { supabase } from './lib/supabase';
import { CHARGE_SHEET } from './lib/chargeSheet';
import { safeHandler } from './lib/safeHandler';

// GET /api/trials/:id — full detail of one run, for reloading a past run
// read-only. Representatives and judges are returned as separate arrays;
// this endpoint does not compute or expose any combined verdict.
export const handler: Handler = safeHandler(async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const trialId = event.queryStringParameters?.id;
  if (!trialId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing trial id' }) };
  }

  const [{ data: run, error: runError }, { data: reps, error: repsError }, { data: judges, error: judgesError }, { data: callLog, error: callLogError }] =
    await Promise.all([
      supabase.from('trial_runs').select('id, started_at, status').eq('id', trialId).single(),
      supabase.from('representative_opinions').select('representative_role, representative_name, seat, argument_text, model_used, created_at').eq('trial_run_id', trialId),
      supabase.from('judge_rulings').select('judge_role, judge_name, verdict, reasoning_text, model_used, created_at').eq('trial_run_id', trialId),
      supabase.from('api_call_logs').select('agent_role, model_used, prompt_tokens, completion_tokens, total_tokens, cost, status, error_message, timestamp').eq('trial_run_id', trialId).order('timestamp', { ascending: true }),
    ]);

  if (runError || !run) {
    return { statusCode: 404, body: JSON.stringify({ error: `Trial run not found: ${runError?.message || trialId}` }) };
  }
  if (repsError || judgesError || callLogError) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Failed to load run detail: ${repsError?.message || judgesError?.message || callLogError?.message}` }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      id: run.id,
      startedAt: run.started_at,
      status: run.status,
      chargeSheet: CHARGE_SHEET,
      representatives: reps,
      judges,
      callLog,
    }),
  };
});
