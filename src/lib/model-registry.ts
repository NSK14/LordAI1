import type { ModelRegistryEntry } from "./lord-config";
import { buildModelRegistry, DEFAULT_MODEL_ID, validateModelId } from "./lord-config";

export { DEFAULT_MODEL_ID, validateModelId };

export const MODEL_REGISTRY: ModelRegistryEntry[] = buildModelRegistry();
