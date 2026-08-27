import type { HandlerEvent, HandlerResponse } from '@netlify/functions';

// Optional shared-secret gate for the 4 API endpoints. When
// VITE_TRIBUNAL_ACCESS_KEY is set, every request must carry a matching
// X-Tribunal-Key header or it is rejected here — before any model call, DB
// write, or DB read. When the variable is unset (the default, and how local
// dev runs) this is a no-op: behaviour is exactly as if the gate weren't
// here, so nothing breaks by adding it.
//
// This is deliberately NOT a real secret. The frontend ships the same value
// in its bundle, so anyone who opens the page's network tab can read it and
// replay requests. Its only job is to make blind bots hitting the function
// URLs bounce off a 401 instead of spending OpenRouter credit. The actual
// spend ceiling is the credit limit set on the OpenRouter key.
//
// One variable name is read by both sides so the frontend and the functions
// can't drift apart. The VITE_ prefix is what exposes it to the frontend
// build; Netlify makes the same value visible to functions at runtime.
export function checkAccess(event: HandlerEvent): HandlerResponse | null {
  const expected = process.env.VITE_TRIBUNAL_ACCESS_KEY;
  if (!expected) return null;

  const headers = event.headers ?? {};
  const provided = headers['x-tribunal-key'] ?? headers['X-Tribunal-Key'] ?? '';
  if (provided === expected) return null;

  return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
}
