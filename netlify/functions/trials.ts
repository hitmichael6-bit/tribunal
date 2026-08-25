import type { Handler } from '@netlify/functions';
import { supabase } from './lib/supabase';
import { CHARGE_SHEET } from './lib/chargeSheet';

// POST /api/trials  -> create a new trial run, return its id + the fixed charge sheet.
// GET  /api/trials  -> list past runs (id, startedAt, status), newest first.
export const handler: Handler = async (event) => {
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

    return { statusCode: 200, body: JSON.stringify({ runs: data }) };
  }

  return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
};
