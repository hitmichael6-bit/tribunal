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

interface PricingEntry {
  promptPrice: number; // $ per token
  completionPrice: number; // $ per token
}

let cache: { fetchedAt: number; byModelId: Map<string, PricingEntry> } | null = null;

async function loadPricingTable(): Promise<Map<string, PricingEntry>> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.byModelId;
  }

  const byModelId = new Map<string, PricingEntry>();
  try {
    const response = await fetch(MODELS_URL);
    if (response.ok) {
      const data: any = await response.json();
      for (const model of data?.data ?? []) {
        const promptPrice = parseFloat(model?.pricing?.prompt ?? '0');
        const completionPrice = parseFloat(model?.pricing?.completion ?? '0');
        if (model?.id) {
          byModelId.set(model.id, {
            promptPrice: Number.isFinite(promptPrice) ? promptPrice : 0,
            completionPrice: Number.isFinite(completionPrice) ? completionPrice : 0,
          });
        }
      }
    }
  } catch {
    // Fall through with whatever (possibly empty) table we have; cost lookup
    // failure is non-fatal — it never blocks logging the call's real
    // token counts and status.
  }

  cache = { fetchedAt: Date.now(), byModelId };
  return byModelId;
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
