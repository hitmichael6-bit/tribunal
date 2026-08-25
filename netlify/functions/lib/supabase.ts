import { createClient } from '@supabase/supabase-js';

// Service-role client — backend only. Never expose SUPABASE_SERVICE_ROLE_KEY
// to the frontend; the browser talks only to /api/* and has no Supabase
// credentials of its own.
const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.warn('[supabase] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — DB calls will fail until configured.');
}

export const supabase = createClient(url || '', serviceRoleKey || '', {
  auth: { persistSession: false },
});
