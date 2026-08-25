import type { OpenRouterCallResult } from './types';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_RETRIES = 2;
const RETRY_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface CallArgs {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  // Hard ceiling on completion length, independent of whatever length
  // guidance is in the prompt text — a backstop against slow/runaway
  // generation, not the primary length control.
  maxTokens: number;
}

// Calls OpenRouter's chat completions endpoint for one agent. Retries a
// couple of times with backoff on 429/5xx (resilience, not concealment —
// whatever ultimately happens is what gets logged). On final failure this
// returns status:'failure' with a message; it never fabricates content.
export async function callOpenRouter({ model, systemPrompt, userPrompt, maxTokens }: CallArgs): Promise<OpenRouterCallResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { status: 'failure', errorMessage: 'OPENROUTER_API_KEY is not configured on the backend.' };
  }

  let lastError = 'Unknown error';

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          // OpenRouter asks for these for its own analytics/rankings; harmless to omit if unset.
          'HTTP-Referer': process.env.PUBLIC_SITE_URL || 'https://tribunal.local',
          // Header values must be ASCII/Latin-1 — no em dash here, fetch() throws on it.
          'X-Title': 'Tribunal - Case T-001',
        },
        body: JSON.stringify({
          model,
          // Some free models (e.g. the default nvidia/nemotron-3.5-lightning:free)
          // are "reasoning" models that silently burn hundreds-to-thousands of
          // hidden reasoning tokens before answering, pushing latency well past
          // any reasonable request timeout. OpenRouter's unified `reasoning`
          // param is ignored by models that don't support it, so it's safe to
          // send unconditionally.
          reasoning: { enabled: false },
          max_tokens: maxTokens,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      });

      if (!response.ok) {
        const bodyText = await response.text().catch(() => '');
        lastError = `OpenRouter ${response.status}: ${bodyText.slice(0, 500)}`;
        if (RETRY_STATUS_CODES.has(response.status) && attempt < MAX_RETRIES) {
          await sleep(500 * Math.pow(2, attempt));
          continue;
        }
        return { status: 'failure', errorMessage: lastError };
      }

      const data: any = await response.json();
      const content: string | undefined = data?.choices?.[0]?.message?.content;
      const usage = data?.usage;

      if (!content || !usage) {
        lastError = 'OpenRouter response was missing message content or usage data.';
        return { status: 'failure', errorMessage: lastError };
      }

      return {
        status: 'success',
        content,
        usage: {
          promptTokens: usage.prompt_tokens ?? 0,
          completionTokens: usage.completion_tokens ?? 0,
          totalTokens: usage.total_tokens ?? (usage.prompt_tokens ?? 0) + (usage.completion_tokens ?? 0),
        },
      };
    } catch (err: any) {
      lastError = `Network/parse error calling OpenRouter: ${err?.message || String(err)}`;
      if (attempt < MAX_RETRIES) {
        await sleep(500 * Math.pow(2, attempt));
        continue;
      }
      return { status: 'failure', errorMessage: lastError };
    }
  }

  return { status: 'failure', errorMessage: lastError };
}
