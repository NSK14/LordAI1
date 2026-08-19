import { PROVIDER_CONFIG } from "./lord-config";

const MODEL_COST: Record<string, { input: number; output: number }> = {};

for (const [provider, config] of Object.entries(PROVIDER_CONFIG)) {
  for (const modelId of config.models) {
    const key = modelId.includes("/") ? modelId : `${provider}/${modelId}`;
    MODEL_COST[key] = { input: 0, output: 0 };
  }
}

export function estimateCost(modelId: string, inputTokens: number, outputTokens: number): number {
  const rate = MODEL_COST[modelId] ?? { input: 0, output: 0 };
  const cost = (inputTokens * rate.input + outputTokens * rate.output) / 1_000_000;
  return Math.round(cost * 10000) / 10000;
}
