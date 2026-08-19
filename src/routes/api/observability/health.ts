import { createFileRoute } from "@tanstack/react-router";
import { requireSupabaseRequestAuth } from "@/integrations/supabase/auth-middleware";
import { createHealthCache } from "@/lib/provider-health";
import { createCircuitBreaker } from "@/lib/circuit-breaker";
import { createModelStatsStore } from "@/lib/model-stats";
import type { SystemHealth } from "@/lib/phase2/types";

export const Route = createFileRoute("/api/observability/health")({
  server: {
    middleware: [requireSupabaseRequestAuth],
    handlers: {
      GET: async () => {
        try {
          const stats = createModelStatsStore({ maxSamples: 100 });
          const healthCache = createHealthCache({
            defaultTtlMs: 15000,
            ttlByStatus: {},
          });
          const circuitBreaker = createCircuitBreaker({
            failureThreshold: 3,
            recoveryMs: 30000,
            halfOpenSuccessThreshold: 1,
          });

          const providers: Record<
            string,
            { status: string; latencyMs: number; lastCheck: string }
          > = {};
          for (const provider of ["gemini", "openrouter", "openai"] as const) {
            const entry = healthCache.get(provider, "*");
            providers[provider] = {
              status: entry ? "healthy" : "degraded",
              latencyMs: 0,
              lastCheck: new Date().toISOString(),
            };
          }

          const circuitBreakers: Record<
            string,
            { state: string; failures: number; lastFailure: string | null }
          > = {};
          for (const provider of ["gemini", "openrouter", "openai"] as const) {
            const state = circuitBreaker.getState(provider, "*");
            circuitBreakers[provider] = {
              state: state.state,
              failures: state.failureCount,
              lastFailure: state.lastFailureAt ? new Date(state.lastFailureAt).toISOString() : null,
            };
          }

          const metrics: SystemHealth = {
            providers,
            circuitBreakers,
            memory: { used: 0, total: 0 },
            embeddingQueue: { pending: 0, processing: 0, failed: 0 },
            backgroundJobs: { pending: 0, running: 0, failed: 0 },
            lastUpdated: new Date().toISOString(),
            status: "healthy",
          };

          return Response.json({ data: metrics });
        } catch (error) {
          return Response.json(
            { error: { code: "internal", message: (error as Error).message } },
            { status: 500 },
          );
        }
      },
    },
  },
});
