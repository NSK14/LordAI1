/** Approximate per-million-token USD pricing for cost estimation. */
const MODEL_COST: Record<string, { input: number; output: number }> = {
  "openai/gpt-4o": { input: 2.5, output: 10 },
  "openai/gpt-4o-mini": { input: 0.15, output: 0.6 },
  "anthropic/claude-sonnet-4": { input: 3, output: 15 },
  "anthropic/claude-opus-4": { input: 15, output: 75 },
  "anthropic/claude-haiku-4.5": { input: 0.8, output: 4 },
  "google/gemini-2.5-pro": { input: 1.25, output: 10 },
  "google/gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "google/gemini-2.5-flash:free": { input: 0, output: 0 },
  "deepseek/deepseek-chat": { input: 0.27, output: 1.1 },
  "qwen/qwen3-coder": { input: 0.3, output: 0.6 },
  "qwen/qwen-2.5-coder-32b-instruct": { input: 0.3, output: 0.6 },
  "meta-llama/llama-3.3-70b-instruct": { input: 0.1, output: 0.4 },
  "meta-llama/llama-3.3-70b-instruct:free": { input: 0, output: 0 },
  local: { input: 0, output: 0 },
};

export function estimateCost(modelId: string, inputTokens: number, outputTokens: number): number {
  const rate = MODEL_COST[modelId] ?? { input: 0, output: 0 };
  const cost = (inputTokens * rate.input + outputTokens * rate.output) / 1_000_000;
  return Math.round(cost * 10000) / 10000;
}
