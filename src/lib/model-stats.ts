import type { ProviderName } from "./lord-config";

export interface ModelStats {
  provider: ProviderName;
  model: string;
  requests: number;
  successes: number;
  failures: number;
  totalTTFTMs: number;
  totalStreamMs: number;
  minTTFTMs: number;
  maxTTFTMs: number;
  minStreamMs: number;
  maxStreamMs: number;
  lastUsedAt: number;
  lastSuccessAt: number;
  lastFailureAt: number;
  recentErrors: Array<{ reason: string; at: number }>;
}

export interface ModelStatsStore {
  record(
    provider: ProviderName,
    model: string,
    stats: {
      success: boolean;
      ttftMs: number;
      streamMs: number;
      reason?: string;
    },
  ): void;
  getStats(provider: ProviderName, model: string): ModelStats;
  getAllStats(): ModelStats[];
  getSortedByPerformance(): ModelStats[];
  resetProvider(provider: ProviderName): void;
  resetAll(): void;
}

export function createModelStatsStore(config: { maxSamples: number }): ModelStatsStore {
  const store = new Map<string, ModelStats>();

  function key(provider: ProviderName, model: string): string {
    return `${provider}:${model}`;
  }

  function getOrCreate(provider: ProviderName, model: string): ModelStats {
    const k = key(provider, model);
    let stats = store.get(k);
    if (!stats) {
      stats = {
        provider,
        model,
        requests: 0,
        successes: 0,
        failures: 0,
        totalTTFTMs: 0,
        totalStreamMs: 0,
        minTTFTMs: Infinity,
        maxTTFTMs: 0,
        minStreamMs: Infinity,
        maxStreamMs: 0,
        lastUsedAt: 0,
        lastSuccessAt: 0,
        lastFailureAt: 0,
        recentErrors: [],
      };
      store.set(k, stats);
    }
    return stats;
  }

  return {
    record(provider, model, data) {
      const stats = getOrCreate(provider, model);
      stats.requests += 1;
      stats.lastUsedAt = Date.now();

      if (data.success) {
        stats.successes += 1;
        stats.lastSuccessAt = Date.now();
        if (data.ttftMs > 0) {
          stats.totalTTFTMs += data.ttftMs;
          stats.minTTFTMs = Math.min(stats.minTTFTMs, data.ttftMs);
          stats.maxTTFTMs = Math.max(stats.maxTTFTMs, data.ttftMs);
        }
        if (data.streamMs > 0) {
          stats.totalStreamMs += data.streamMs;
          stats.minStreamMs = Math.min(stats.minStreamMs, data.streamMs);
          stats.maxStreamMs = Math.max(stats.maxStreamMs, data.streamMs);
        }
      } else {
        stats.failures += 1;
        stats.lastFailureAt = Date.now();
        if (data.reason) {
          stats.recentErrors.push({ reason: data.reason, at: Date.now() });
          if (stats.recentErrors.length > config.maxSamples) {
            stats.recentErrors = stats.recentErrors.slice(-config.maxSamples);
          }
        }
      }
    },

    getStats(provider, model) {
      return getOrCreate(provider, model);
    },

    getAllStats() {
      return Array.from(store.values()).map((s) => ({ ...s }));
    },

    getSortedByPerformance() {
      return Array.from(store.values())
        .filter((s) => s.requests > 0)
        .map((s) => {
          const avgTTFT = s.successes > 0 ? s.totalTTFTMs / s.successes : Infinity;
          const failureRate = s.requests > 0 ? s.failures / s.requests : 1;
          return { ...s, avgTTFT, failureRate };
        })
        .sort((a, b) => {
          if (a.failureRate !== b.failureRate) return a.failureRate - b.failureRate;
          return a.avgTTFT - b.avgTTFT;
        });
    },

    resetProvider(provider) {
      for (const k of store.keys()) {
        if (k.startsWith(`${provider}:`)) {
          store.delete(k);
        }
      }
    },

    resetAll() {
      store.clear();
    },
  };
}
