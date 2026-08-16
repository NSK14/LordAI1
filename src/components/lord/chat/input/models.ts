export interface ModelDef {
  id: string;
  label: string;
  provider: string;
}

export const MODELS: ModelDef[] = [
  { id: "openai/gpt-4o", label: "GPT-4o", provider: "OpenAI" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o Mini", provider: "OpenAI" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "Google" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "Google" },
];

export const DEFAULT_MODEL_ID = "google/gemini-2.5-flash";

export function getModelDef(id: string): ModelDef {
  return MODELS.find((m) => m.id === id) ?? MODELS[0];
}
