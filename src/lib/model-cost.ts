/** Approximate per-million-token USD pricing for cost estimation. */
const MODEL_COST: Record<string, { input: number; output: number }> = {
  "openai/gpt-4o": { input: 2.5, output: 10 },
  "openai/gpt-4o-mini": { input: 0.15, output: 0.6 },
  "google/gemini-2.5-pro": { input: 1.25, output: 10 },
  "google/gemini-2.5-flash": { input: 0.3, output: 2.5 },
  local: { input: 0, output: 0 },
};

export function estimateCost(modelId: string, inputTokens: number, outputTokens: number): number {
  const rate = MODEL_COST[modelId] ?? { input: 0, output: 0 };
  const cost = (inputTokens * rate.input + outputTokens * rate.output) / 1_000_000;
  return Math.round(cost * 10000) / 10000;
}
