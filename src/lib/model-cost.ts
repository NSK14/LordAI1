/** Approximate per-million-token USD pricing for cost estimation. */
const MODEL_COST: Record<string, { input: number; output: number }> = {
  "google/gemini-2.5-pro": { input: 0, output: 0 },
  "google/gemini-2.5-flash": { input: 0, output: 0 },
  "google/gemma-4-26b-a4b-it:free": { input: 0, output: 0 },
  "openai/gpt-oss-20b:free": { input: 0, output: 0 },
  local: { input: 0, output: 0 },
};

export function estimateCost(modelId: string, inputTokens: number, outputTokens: number): number {
  const rate = MODEL_COST[modelId] ?? { input: 0, output: 0 };
  const cost = (inputTokens * rate.input + outputTokens * rate.output) / 1_000_000;
  return Math.round(cost * 10000) / 10000;
}
