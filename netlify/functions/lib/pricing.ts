// Cost calculation, kept generic rather than a hardcoded per-model table.
//
// OpenRouter's /api/v1/models endpoint returns per-token prompt/completion
// pricing for every model it serves. We fetch and cache that list in memory
// (per warm function instance) and compute cost = tokens * price. This is
// correct automatically for the $0 default free model and for any paid
// model a deployer swaps in later via the MODEL_* env vars — no pricing
// table to keep in sync by hand.

const MODELS_URL = 'https://openrouter.ai/api/v1/models';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
// This fetch is on the critical path of every agent endpoint (cost is
// computed before the call is logged and the response returned), so it gets
// a tight deadline of its own. If OpenRouter is slow, cost logs as null
// rather than pushing the whole handler toward the function timeout.
const PRICING_FETCH_TIMEOUT_MS = 4000;

interface PricingEntry {
  promptPrice: number; // $ per token
  completionPrice: number; // $ per token
}

let cache: { fetchedAt: number; byModelId: Map<string, PricingEntry> } | null = null;

async function loadPricingTable(): Promise<Map<string, PricingEntry>> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.byModelId;
  }

  let fetched: Map<string, PricingEntry> | null = null;
  try {
    const response = await fetch(MODELS_URL, { signal: AbortSignal.timeout(PRICING_FETCH_TIMEOUT_MS) });
    if (response.ok) {
      const data: any = await response.json();
      const parsed = new Map<string, PricingEntry>();
      for (const model of data?.data ?? []) {
        const promptPrice = parseFloat(model?.pricing?.prompt ?? '0');
        const completionPrice = parseFloat(model?.pricing?.completion ?? '0');
        if (model?.id) {
          parsed.set(model.id, {
            promptPrice: Number.isFinite(promptPrice) ? promptPrice : 0,
            completionPrice: Number.isFinite(completionPrice) ? completionPrice : 0,
          });
        }
      }
      if (parsed.size > 0) fetched = parsed;
    }
  } catch {
    // Network error or the timeout above — non-fatal. Cost lookup failure
    // never blocks logging the call's real token counts and status.
  }

  if (fetched) {
    cache = { fetchedAt: Date.now(), byModelId: fetched };
    return fetched;
  }
  // Fetch failed: reuse a stale table if we have one, otherwise an empty
  // table for this call only — don't cache the failure and lock cost
  // lookups to null for the next hour.
  return cache?.byModelId ?? new Map();
}

export async function getCost(modelId: string, promptTokens: number, completionTokens: number): Promise<number | null> {
  const table = await loadPricingTable();
  const entry = table.get(modelId);
  if (!entry) {
    console.warn(`[pricing] No pricing entry found for model "${modelId}"; logging cost as null.`);
    return null;
  }
  return promptTokens * entry.promptPrice + completionTokens * entry.completionPrice;
}
