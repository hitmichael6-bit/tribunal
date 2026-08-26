import type { Handler, HandlerResponse } from '@netlify/functions';

// Wraps a handler so any uncaught exception becomes a clean JSON error
// response instead of an opaque 500 with no message. This matters because
// not everything that can fail resolves to an {error} object the way a
// Supabase query result does — a transient network failure talking to
// Supabase (or anything else unexpected) can reject/throw instead, and
// without this wrapper that propagates as an unhandled crash. Every
// function handler goes through this; nothing should ever throw uncaught
// out of a Netlify Function.
export function safeHandler(fn: Handler): Handler {
  return async (event, context) => {
    try {
      // Every handler wrapped by this always returns a response object in
      // practice (none of the 4 functions use the void/streaming form) —
      // the cast just satisfies the wider Handler type.
      return (await fn(event, context)) as HandlerResponse;
    } catch (err: any) {
      console.error('[unhandled]', err);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: `Unexpected server error: ${err?.message || String(err)}` }),
      };
    }
  };
}
