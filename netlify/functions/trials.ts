import type { Handler } from '@netlify/functions';
import { supabase } from './lib/supabase';
import { CHARGE_SHEET } from './lib/chargeSheet';
import { safeHandler } from './lib/safeHandler';
import { checkAccess } from './lib/checkAccess';

// POST /api/trials  -> create a new trial run, return its id + the fixed charge sheet.
// GET  /api/trials  -> list past runs (id, startedAt, status), newest first.
export const handler: Handler = safeHandler(async (event) => {
  const denied = checkAccess(event);
  if (denied) return denied;

  if (event.httpMethod === 'POST') {
    const { data, error } = await supabase
      .from('trial_runs')
      .insert({ status: 'running' })
      .select('id, started_at, status')
      .single();

    if (error || !data) {
      return { statusCode: 500, body: JSON.stringify({ error: `Failed to create trial run: ${error?.message}` }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        id: data.id,
        startedAt: data.started_at,
        status: data.status,
        chargeSheet: CHARGE_SHEET,
      }),
    };
  }

  if (event.httpMethod === 'GET') {
    const { data, error } = await supabase
      .from('trial_runs')
      .select('id, started_at, status')
      .order('started_at', { ascending: false })
      .limit(50);

    if (error) {
      return { statusCode: 500, body: JSON.stringify({ error: `Failed to list trial runs: ${error.message}` }) };
    }

    // `status` alone only tracks how far a run got (running / representatives
    // complete / completed) — it does NOT mean every call inside it
    // succeeded. Separately flag whether any call in each run actually
    // failed, so a run that reached "completed" while several agents hit
    // errors doesn't read as a clean success in the history list.
    const runIds = (data ?? []).map((r) => r.id);
    let failedRunIds = new Set<string>();
    if (runIds.length > 0) {
      const { data: failureLogs } = await supabase
        .from('api_call_logs')
        .select('trial_run_id')
        .eq('status', 'failure')
        .in('trial_run_id', runIds);
      failedRunIds = new Set((failureLogs ?? []).map((f) => f.trial_run_id));
    }

    const runs = (data ?? []).map((r) => ({ ...r, hadFailures: failedRunIds.has(r.id) }));

    return { statusCode: 200, body: JSON.stringify({ runs }) };
  }

  return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
});
