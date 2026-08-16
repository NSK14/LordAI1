import type { ProviderName } from "./lord-config";

export type CircuitState = "closed" | "open" | "half_open";

export interface CircuitBreakerEntry {
  provider: ProviderName;
  model: string;
  state: CircuitState;
  failureCount: number;
  openedAt: number;
  lastFailureAt: number;
  halfOpenSuccessCount: number;
}

export interface CircuitBreaker {
  getState(provider: ProviderName, model: string): CircuitBreakerEntry;
  recordSuccess(provider: ProviderName, model: string): void;
  recordFailure(provider: ProviderName, model: string): void;
  isOpen(provider: ProviderName, model: string): boolean;
  resetProvider(provider: ProviderName): void;
  resetModel(provider: ProviderName, model: string): void;
  resetAll(): void;
  getAll(): CircuitBreakerEntry[];
}

export function createCircuitBreaker(config: {
  failureThreshold: number;
  recoveryMs: number;
  halfOpenSuccessThreshold: number;
}): CircuitBreaker {
  const breakers = new Map<string, CircuitBreakerEntry>();

  function key(provider: ProviderName, model: string): string {
    return `${provider}:${model}`;
  }

  function getOrCreate(provider: ProviderName, model: string): CircuitBreakerEntry {
    const k = key(provider, model);
    let entry = breakers.get(k);
    if (!entry) {
      entry = {
        provider,
        model,
        state: "closed",
        failureCount: 0,
        openedAt: 0,
        lastFailureAt: 0,
        halfOpenSuccessCount: 0,
      };
      breakers.set(k, entry);
    }
    return entry;
  }

  function maybeHalfOpen(entry: CircuitBreakerEntry): void {
    if (entry.state === "open" && Date.now() >= entry.openedAt + config.recoveryMs) {
      entry.state = "half_open";
      entry.halfOpenSuccessCount = 0;
    }
  }

  return {
    getState(provider, model) {
      const entry = getOrCreate(provider, model);
      maybeHalfOpen(entry);
      return { ...entry };
    },

    recordSuccess(provider, model) {
      const entry = getOrCreate(provider, model);
      if (entry.state === "half_open") {
        entry.halfOpenSuccessCount += 1;
        if (entry.halfOpenSuccessCount >= config.halfOpenSuccessThreshold) {
          entry.state = "closed";
          entry.failureCount = 0;
          entry.openedAt = 0;
          entry.halfOpenSuccessCount = 0;
        }
      } else if (entry.state === "closed") {
        entry.failureCount = 0;
      }
    },

    recordFailure(provider, model) {
      const entry = getOrCreate(provider, model);
      entry.failureCount += 1;
      entry.lastFailureAt = Date.now();
      if (entry.state === "half_open") {
        entry.state = "open";
        entry.openedAt = Date.now();
        entry.halfOpenSuccessCount = 0;
      } else if (entry.state === "closed" && entry.failureCount >= config.failureThreshold) {
        entry.state = "open";
        entry.openedAt = Date.now();
      }
    },

    isOpen(provider, model) {
      const entry = getOrCreate(provider, model);
      maybeHalfOpen(entry);
      return entry.state === "open";
    },

    resetProvider(provider) {
      for (const k of breakers.keys()) {
        if (k.startsWith(`${provider}:`)) {
          breakers.delete(k);
        }
      }
    },

    resetModel(provider, model) {
      breakers.delete(key(provider, model));
    },

    resetAll() {
      breakers.clear();
    },

    getAll() {
      return Array.from(breakers.values()).map((e) => ({ ...e }));
    },
  };
}
