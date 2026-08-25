# Tribunal — Case T-001: The Realm v. Jon Snow

A fixed, canonical fictional trial run by 7 AI agents — 4 representatives (2 defense, 2 prosecution) and 3 judges, each modeled on a distinct real judicial philosophy — over a browser / backend / database three-tier architecture. The full case content lives in [`netlify/functions/lib/chargeSheet.ts`](./netlify/functions/lib/chargeSheet.ts); each agent's character/judicial-philosophy depth lives in its own file under [`netlify/functions/lib/prompts/`](./netlify/functions/lib/prompts/).

## Architecture

- **Browser** — React + TypeScript + Vite SPA (`frontend/`). Talks only to `/api/*`; holds no API keys or DB credentials.
- **Backend** — Netlify Functions, Node + TypeScript (`netlify/functions/`). Holds `OPENROUTER_API_KEY` and the Supabase service-role key. Orchestrates all 7 OpenRouter calls and all DB writes.
- **Database** — Supabase Postgres (`db/schema.sql`). Stores the fixed charge sheet, every trial run, all 7 opinions/rulings per run, and a full per-call log.

Call ordering: the 4 representatives run in parallel, each as its own request to `POST /api/trials/:id/representatives/:role`; the 3 judges then run in parallel, each as its own request to `POST /api/trials/:id/judges/:role`, receiving the charge sheet plus all 4 representative arguments. Every agent gets its own function invocation rather than one invocation awaiting several model calls at once — testing showed the latter pushes uncomfortably close to serverless function time limits, since this model can take 10-25s per call. The frontend fires each phase's calls in parallel and updates each card as its own call resolves; the backend still owns every OpenRouter call and every DB write.

Two model-behavior quirks worth knowing if you change the default model or touch `netlify/functions/lib/openrouter.ts`: (1) `nvidia/nemotron-3.5-lightning:free` is a "reasoning" model that silently burns hundreds-to-thousands of hidden tokens per call unless `reasoning: { enabled: false }` is sent — without it, calls can take 60s+; (2) it tends to run past requested word counts, so every call also sets a `max_tokens` cap as a backstop against runaway generation.

**Hard invariant**: the 3 judge rulings are never combined, aggregated, or voted into a single result — no such field exists in the schema, the API responses, or the UI.

## One-time setup

1. **Supabase**: create a project at [supabase.com](https://supabase.com), then run the contents of [db/schema.sql](./db/schema.sql) in its SQL editor. This creates all tables and seeds the fixed `charge_sheet` row.
2. **OpenRouter**: create an API key at [openrouter.ai](https://openrouter.ai/keys).
3. **Env vars**: `cp .env.example .env` and fill in `OPENROUTER_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (the *service role* key, not the anon key — this is a backend-only secret).
4. Install dependencies:
   ```
   npm install
   npm --prefix frontend install
   ```

## Run locally

```
npm run dev
```

This runs `netlify dev`, which serves the frontend and functions together (default `http://localhost:8888`) and reads `.env` automatically. First run will prompt you to link/init a Netlify site — you can choose to skip linking and it'll still serve locally.

**Known local-dev quirk**: after many requests in one long-running `netlify dev` process, its local function simulator (`lambda-local`) can start hanging on outbound network calls until requests time out at 30s — observed during testing, not present on a fresh process, and not expected in an actual deployed Netlify environment (each real invocation is isolated). If calls that were working suddenly start timing out during a long dev session, just stop (Ctrl+C) and restart `npm run dev`.

## Models

Every agent's model id is read from an env var, falling back to `DEFAULT_MODEL`. Nothing about model choice is hardcoded in the prompt/orchestration code — see `.env.example` for the full list of per-role overrides (`MODEL_JON_SNOW`, `MODEL_JUDGE_BARAK`, etc.).

The default, `nvidia/nemotron-3.5-lightning:free`, was picked because it's free on OpenRouter, has a large context window, and OpenRouter's free-tier rate limits are per-account (not per-model) — 20 req/min and 50 req/day with no purchase history, comfortably enough for a 7-call trial run. Swap `DEFAULT_MODEL` (or any per-role override) for any other OpenRouter model id at any time; cost logging adapts automatically (see below).

## Cost & token logging

Every call logs `agent_role, model_used, prompt_tokens, completion_tokens, total_tokens, cost, status, timestamp` to `api_call_logs`, visible in the UI's call log table. Token counts come directly from each OpenRouter response's `usage` field. Cost is computed by looking up the model's per-token pricing from OpenRouter's `/api/v1/models` endpoint at call time (cached in memory for an hour) — this keeps cost correct for the $0 default model and for any paid model you swap in later, with no pricing table to hand-maintain.

## Failure handling

A failed OpenRouter call (after retries) is logged with `status='failure'` and an error message, and that agent's card renders as a visible failure in the UI — the app never fabricates a missing argument or ruling. If a representative's call fails, the judges are told explicitly that no submission is available from that representative, rather than the failure being silently papered over.

## Project layout

```
netlify/functions/       backend: 5 endpoints + lib/ (OpenRouter client, pricing, Supabase client, prompts, types)
frontend/                React/Vite SPA
db/schema.sql             full schema + charge-sheet seed
netlify.toml               function routing (/api/* -> functions), build config
.env.example
```
