import { z } from "zod";

export type ModelRegistryEntry = {
  id: string; // actual model ID
  label: string;
  provider: string;
  description?: string;
};

// Single source of truth for all selectable models.
// This registry is derived from PROVIDER_CONFIG in lord-config.ts.
// Only models that are actively configured for a provider appear here.
// Update/add models in lord-config.ts PROVIDER_CONFIG first.
export const MODEL_REGISTRY: ModelRegistryEntry[] = [
  {
    id: "openai/gpt-4o",
    label: "GPT-4o",
    provider: "OpenAI",
    description: "OpenAI's most capable multimodal model",
  },
  {
    id: "openai/gpt-4o-mini",
    label: "GPT-4o Mini",
    provider: "OpenAI",
    description: "Fast, cost-effective GPT-4o variant",
  },
  {
    id: "google/gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    provider: "Google",
    description: "Google's most capable reasoning model",
  },
  {
    id: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    provider: "Google",
    description: "Google's fast, efficient model",
  },
];

// If the primary choice becomes unavailable, server falls back to the default.
export const DEFAULT_MODEL_ID: string = MODEL_REGISTRY[0]?.id ?? "";

const ModelIdSchema = z.string().min(1);

export function validateModelId(
  modelId: unknown,
): { valid: true; modelId: string } | { valid: false; modelId: string; reason: string } {
  const fallback = DEFAULT_MODEL_ID;

  const parsed = ModelIdSchema.safeParse(modelId);
  if (!parsed.success) {
    return { valid: false, modelId: fallback, reason: "missing_or_not_string" };
  }

  const knownIds = new Set(MODEL_REGISTRY.map((m) => m.id));
  if (knownIds.has(parsed.data)) {
    return { valid: true, modelId: parsed.data };
  }

  return { valid: false, modelId: fallback, reason: "unknown_model_id" };
}
