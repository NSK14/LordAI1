export interface ModelDef {
  id: string;
  label: string;
  provider: string;
}

export const MODELS: ModelDef[] = [
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "Google" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "Google" },
  { id: "google/gemma-4-26b-a4b-it:free", label: "Gemma 4 26B (Free)", provider: "OpenRouter" },
  { id: "openai/gpt-oss-20b:free", label: "GPT OSS 20B (Free)", provider: "OpenRouter" },
];

export const DEFAULT_MODEL_ID = "google/gemini-2.5-flash";

export function getModelDef(id: string): ModelDef {
  return MODELS.find((m) => m.id === id) ?? MODELS[0];
}
