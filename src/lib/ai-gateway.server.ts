import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import {
  generateText,
  streamText,
  type LanguageModel,
  type ModelMessage,
  type StreamTextResult,
} from "ai";

import { estimateCost } from "@/lib/model-cost";
import type { TokenUsageEvent } from "@/lib/token-usage-store";
import {
  LORD_MODE_LABELS,
  classifyModelError,
  OpenRouterClientError,
  type LordMode,
  type ModelAttempt,
  type ProviderName,
  type Candidate,
  PROVIDER_CONFIG,
  getModeCandidates,
  resolveCandidate,
} from "./lord-config";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_CHAT_PATH = "/chat/completions";
const OPENROUTER_REFERER = process.env.OPENROUTER_REFERER || "https://lordai.app";
const OPENROUTER_TITLE = process.env.OPENROUTER_TITLE || "LordAI";
const OPENROUTER_TIMEOUT_MS = 45_000;

// Default per-provider timeouts (ms). Each provider can override these when
// constructed; the values below are conservative upper bounds.
const PROVIDER_TIMEOUTS: Record<ProviderName, number> = {
  gemini: 45_000,
  openrouter: 45_000,
  openai: 45_000,
};

// A tiny, non-streaming pre-flight ("probe") is used to confirm a candidate
// model actually works before we commit to streaming it to the client. This is
// what makes automatic fallback reliable: most failures (credits, rate limits,
// unavailable models, timeouts, network errors) surface here, letting the
// backend transparently try the next candidate. Only after a candidate passes
// the probe do we open the real stream to the user.
const PROBE_MAX_OUTPUT_TOKENS = 1;
const PROBE_TIMEOUT_MS = 6_000;
const REASON_LABELS: Record<string, string> = {
  invalid_api_key: "Invalid API key",
  malformed_request: "Malformed request",
  invalid_messages: "Invalid messages",
  insufficient_credits: "Insufficient credits",
  rate_limit: "Rate limited",
  model_unavailable: "Model unavailable",
  provider_error: "Provider error",
  unknown: "Unknown error",
};

// ---------------------------------------------------------------------------
// Key validation (never logs the key itself)
// ---------------------------------------------------------------------------

export function validateApiKey(apiKey: string | undefined): { valid: boolean; issue?: string } {
  if (!apiKey) return { valid: false, issue: "missing" };
  if (apiKey !== apiKey.trim()) return { valid: false, issue: "contains surrounding whitespace" };
  if (/\s/.test(apiKey)) return { valid: false, issue: "contains whitespace" };
  if (apiKey.includes('"') || apiKey.includes("'"))
    return { valid: false, issue: "contains quotes" };
  if (apiKey.includes("\n") || apiKey.includes("\r"))
    return { valid: false, issue: "contains newline" };
  return { valid: true };
}

export function validateOpenRouterApiKey(apiKey: string | undefined): {
  valid: boolean;
  issue?: string;
} {
  return validateApiKey(apiKey);
}

// ---------------------------------------------------------------------------
// Environment / local-vs-Vercel diagnostics
// ---------------------------------------------------------------------------

let diagnosticsLogged = false;

export function getLordEnvironmentDiagnostics() {
  const isEdge = typeof (globalThis as { EdgeRuntime?: unknown }).EdgeRuntime !== "undefined";
  return {
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
    hasOpenAiKey: !!process.env.OPENAI_API_KEY,
    nodeVersion: process.version,
    runtime: isEdge ? "edge" : "node",
    platform: typeof process.platform === "string" ? process.platform : "unknown",
    deployedOn: process.env.VERCEL ? "vercel" : (process.env.NITRO_PRESET ?? "local"),
  };
}

function logDiagnosticsOnce() {
  if (diagnosticsLogged) return;
  diagnosticsLogged = true;
  console.info(
    JSON.stringify({
      event: "lord_diagnostics",
      ...getLordEnvironmentDiagnostics(),
    }),
  );
}

// ---------------------------------------------------------------------------
// Instrumented fetch wrappers (per provider)
// ---------------------------------------------------------------------------

function mergeAbortSignals(signals: AbortSignal[]) {
  const controller = new AbortController();
  const abort = () => controller.abort();

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      break;
    }
    signal.addEventListener("abort", abort, { once: true });
  }

  return controller.signal;
}

function classifyFetchError(error: unknown): {
  kind: "network" | "abort" | "timeout" | "unknown";
  name: string;
  message: string;
  stack?: string;
} {
  const name = error instanceof Error ? error.name : typeof error;
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  const lower = message.toLowerCase();

  if (name === "AbortError" || lower.includes("abort") || lower.includes("aborted")) {
    return { kind: "abort", name, message, stack };
  }
  if (lower.includes("timed out") || lower.includes("timeout") || lower.includes("deadline")) {
    return { kind: "timeout", name, message, stack };
  }
  if (name === "TypeError" || lower.includes("fetch failed") || lower.includes("network")) {
    return { kind: "network", name, message, stack };
  }
  return { kind: "unknown", name, message, stack };
}

// Read a header value case-insensitively from whatever shape `fetch` gives us.
function readHeader(headers: HeadersInit | undefined, name: string): string | undefined {
  if (!headers) return undefined;
  const lower = name.toLowerCase();
  if (typeof Headers !== "undefined" && headers instanceof Headers) {
    return headers.get(name) ?? undefined;
  }
  if (Array.isArray(headers)) {
    for (const [k, v] of headers) {
      if (k.toLowerCase() === lower) return v;
    }
    return undefined;
  }
  const record = headers as Record<string, string>;
  for (const [k, v] of Object.entries(record)) {
    if (k.toLowerCase() === lower) return v;
  }
  return undefined;
}

function summarizePayload(body?: BodyInit | null): Record<string, unknown> {
  if (!body || typeof body !== "string") return { hasBody: false };
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    return {
      model: parsed.model,
      stream: parsed.stream,
      messagesLength: Array.isArray(parsed.messages)
        ? (parsed.messages as unknown[]).length
        : undefined,
      temperature: parsed.temperature,
      max_tokens: parsed.max_tokens ?? parsed.max_completion_tokens,
    };
  } catch {
    return { parseError: "request body was not valid JSON" };
  }
}

// Create a provider-aware fetch wrapper. Logs structured `ai_provider_*` events
// and throws `OpenRouterClientError` (the existing classification machinery
// understands it). The error carries the provider name so callers can record
// circuit-breaker / health state.
function makeProviderFetch(provider: ProviderName, timeoutMs: number) {
  return async function providerFetch(input: RequestInfo | URL, init?: RequestInit) {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : (input as Request).url;

    const authHeader = readHeader(init?.headers, "authorization");
    const xGoogKey = readHeader(init?.headers, "x-goog-api-key");
    const contentType = readHeader(init?.headers, "content-type");

    console.info(
      JSON.stringify({
        event: "ai_provider_request",
        provider,
        url,
        hasAuth: !!authHeader && authHeader.startsWith("Bearer "),
        hasGoogleKey: !!xGoogKey,
        contentType,
        payload: summarizePayload(init?.body as string | undefined),
      }),
    );

    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = init?.signal ? mergeAbortSignals([init.signal, timeout]) : timeout;

    try {
      const response = await fetch(input, { ...init, signal });

      const responseHeaders: Record<string, string> = {};
      if (typeof response.headers?.entries === "function") {
        for (const [k, v] of response.headers.entries()) responseHeaders[k] = v;
      }
      const requestId = response.headers.get("x-request-id") ?? undefined;

      console.info(
        JSON.stringify({
          event: "ai_provider_response",
          provider,
          url,
          status: response.status,
          statusText: response.statusText,
          requestId,
          headers: responseHeaders,
        }),
      );

      if (response.ok) {
        return response;
      }

      const bodyText = await response.text();
      console.error(
        JSON.stringify({
          event: "ai_provider_response_error",
          provider,
          url,
          status: response.status,
          statusText: response.statusText,
          requestId,
          body: bodyText,
        }),
      );

      if (response.status === 429 || response.status === 404 || response.status >= 500) {
        console.warn(
          JSON.stringify({
            event: "ai_provider_recoverable_response",
            provider,
            status: response.status,
            requestId,
          }),
        );
      }

      throw new OpenRouterClientError(
        `${provider} responded with ${response.status} ${response.statusText}`,
        { kind: "api", status: response.status, body: bodyText },
      );
    } catch (error) {
      const { kind, name, message, stack } = classifyFetchError(error);
      const effectiveKind = error instanceof OpenRouterClientError ? error.kind : kind;

      console.error(
        JSON.stringify({
          event: "ai_provider_network_error",
          provider,
          url,
          kind: effectiveKind,
          name,
          message,
          stack,
        }),
      );

      if (error instanceof OpenRouterClientError) throw error;
      const structured = new OpenRouterClientError(
        `${provider} client ${effectiveKind}: ${message}`,
        { kind: effectiveKind === "unknown" ? "network" : effectiveKind },
      );
      (structured as unknown as { lordProvider?: string }).lordProvider = provider;
      throw structured;
    }
  };
}

// ---------------------------------------------------------------------------
// Circuit breaker + provider health cache
// ---------------------------------------------------------------------------
// A per-provider circuit breaker prevents hammering a repeatedly failing
// provider (rate limits, 5xx, outages). After `CB_FAILURE_THRESHOLD` consecutive
// failures the provider is tripped "open" for `CB_RECOVERY_MS`, during which
// candidates for that provider are skipped immediately. This keeps request
// latency bounded instead of waiting on a dead provider every time.
//
// The health cache records the most recent success/failure timestamp per
// provider so routing can prefer healthy providers when several are available.

const CB_FAILURE_THRESHOLD = 3;
const CB_RECOVERY_MS = 30_000;
const HEALTH_CACHE_TTL_MS = 15_000;

interface CircuitBreakerState {
  failureCount: number;
  openedAt: number;
}

interface ProviderHealth {
  healthy: boolean;
  lastCheck: number;
  lastError?: string;
}

const circuitBreakers = new Map<ProviderName, CircuitBreakerState>();
const healthCache = new Map<ProviderName, ProviderHealth>();

function getCircuitState(name: ProviderName): CircuitBreakerState {
  let state = circuitBreakers.get(name);
  if (!state) {
    state = { failureCount: 0, openedAt: 0 };
    circuitBreakers.set(name, state);
  }
  return state;
}

export function isProviderCircuitOpen(name: ProviderName): boolean {
  const state = getCircuitState(name);
  if (state.failureCount < CB_FAILURE_THRESHOLD) return false;
  const recoveryAt = state.openedAt + CB_RECOVERY_MS;
  if (Date.now() < recoveryAt) return true;
  // Recovery window elapsed: half-open — reset and allow a probe.
  state.failureCount = 0;
  state.openedAt = 0;
  return false;
}

export function recordProviderFailure(name: ProviderName, error: string): void {
  const state = getCircuitState(name);
  state.failureCount += 1;
  if (state.failureCount >= CB_FAILURE_THRESHOLD && state.openedAt === 0) {
    state.openedAt = Date.now();
  }
  healthCache.set(name, { healthy: false, lastError: error, lastCheck: Date.now() });
}

export function recordProviderSuccess(name: ProviderName): void {
  const state = getCircuitState(name);
  state.failureCount = 0;
  state.openedAt = 0;
  healthCache.set(name, { healthy: true, lastCheck: Date.now() });
}

export function getProviderHealth(name: ProviderName): ProviderHealth {
  const state = healthCache.get(name);
  if (!state) return { healthy: true, lastCheck: 0 };
  if (Date.now() - state.lastCheck > HEALTH_CACHE_TTL_MS) {
    healthCache.delete(name);
    return { healthy: true, lastCheck: 0 };
  }
  return state;
}

// Extract the provider name attached to a structured error so circuit-breaker
// bookkeeping works even when the AI SDK re-throws our error as `cause`.
export function getProviderFromError(error: unknown): ProviderName | undefined {
  const seen = new Set<unknown>();
  let cur: unknown = error;
  while (cur && typeof cur === "object" && !seen.has(cur)) {
    seen.add(cur);
    const p = (cur as Record<string, unknown>).lordProvider;
    if (typeof p === "string") return p as ProviderName;
    cur = (cur as { cause?: unknown }).cause;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Provider factories
// ---------------------------------------------------------------------------

interface LordProviders {
  gemini: ReturnType<typeof createGoogleGenerativeAI> | null;
  openrouter: ReturnType<typeof createOpenAICompatible> | null;
  openai: ReturnType<typeof createOpenAI> | null;
}

interface LordProviderMeta {
  timeoutMs: number;
  hasKey: boolean;
}

export interface LordProvidersState {
  providers: LordProviders;
  meta: Record<ProviderName, LordProviderMeta>;
}

// Lazily construct each provider only if its key is present. Missing keys are
// graceful: the provider stays `null` and candidates for it are skipped during
// routing, so LORD continues using whichever providers are configured.
export function createLordProviders(): LordProvidersState {
  logDiagnosticsOnce();

  const geminiKey = process.env.GEMINI_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  const providers: LordProviders = {
    gemini: null,
    openrouter: null,
    openai: null,
  };

  const meta: Record<ProviderName, LordProviderMeta> = {
    gemini: {
      timeoutMs: PROVIDER_TIMEOUTS.gemini,
      hasKey: !!geminiKey && validateApiKey(geminiKey).valid,
    },
    openrouter: {
      timeoutMs: PROVIDER_TIMEOUTS.openrouter,
      hasKey: !!openRouterKey && validateApiKey(openRouterKey).valid,
    },
    openai: {
      timeoutMs: PROVIDER_TIMEOUTS.openai,
      hasKey: !!openaiKey && validateApiKey(openaiKey).valid,
    },
  };

  if (geminiKey) {
    const validation = validateApiKey(geminiKey);
    if (!validation.valid) {
      console.error(
        JSON.stringify({
          event: "ai_provider_invalid_key",
          provider: "gemini",
          issue: validation.issue,
        }),
      );
    } else {
      providers.gemini = createGoogleGenerativeAI({
        apiKey: geminiKey,
        fetch: makeProviderFetch("gemini", PROVIDER_TIMEOUTS.gemini),
      });
    }
  }

  if (openRouterKey) {
    const validation = validateApiKey(openRouterKey);
    if (!validation.valid) {
      console.error(
        JSON.stringify({
          event: "ai_provider_invalid_key",
          provider: "openrouter",
          issue: validation.issue,
        }),
      );
    } else {
      providers.openrouter = createOpenAICompatible({
        name: "openrouter",
        baseURL: OPENROUTER_BASE_URL,
        apiKey: openRouterKey,
        headers: {
          "HTTP-Referer": OPENROUTER_REFERER,
          "X-Title": OPENROUTER_TITLE,
        },
        fetch: makeProviderFetch("openrouter", PROVIDER_TIMEOUTS.openrouter),
        includeUsage: true,
      });
    }
  }

  if (openaiKey) {
    const validation = validateApiKey(openaiKey);
    if (!validation.valid) {
      console.error(
        JSON.stringify({
          event: "ai_provider_invalid_key",
          provider: "openai",
          issue: validation.issue,
        }),
      );
    } else {
      providers.openai = createOpenAI({
        apiKey: openaiKey,
        fetch: makeProviderFetch("openai", PROVIDER_TIMEOUTS.openai),
      });
    }
  }

  return { providers, meta };
}

// Backwards-compatible: create a single OpenRouter provider from a key. Still
// exported for any callers/tests that relied on it; the multi-provider path
// prefers `createLordProviders` + `createLordGateway`.
export function createOpenRouterProvider(apiKey: string) {
  const validation = validateApiKey(apiKey);
  if (!validation.valid) {
    console.error(JSON.stringify({ event: "openrouter_invalid_api_key", issue: validation.issue }));
    throw new OpenRouterClientError(`Invalid OPENROUTER_API_KEY: ${validation.issue}`, {
      kind: "api",
      status: 401,
    });
  }

  logDiagnosticsOnce();

  return createOpenAICompatible({
    name: "openrouter",
    baseURL: OPENROUTER_BASE_URL,
    apiKey,
    headers: {
      "HTTP-Referer": OPENROUTER_REFERER,
      "X-Title": OPENROUTER_TITLE,
    },
    fetch: makeProviderFetch("openrouter", OPENROUTER_TIMEOUT_MS),
    includeUsage: true,
  });
}

// Return the list of providers that have valid keys configured, in stable order.
export function getConfiguredProviders(): ProviderName[] {
  return (["gemini", "openrouter", "openai"] as const).filter((p) => {
    const key = PROVIDER_CONFIG[p].apiKeyEnv;
    const value = process.env[key];
    return !!value && validateApiKey(value).valid;
  });
}

// Clear all circuit-breaker and health-cache state. Intended for tests and
// hot-reload safety so a previous process' failure counts are not inherited.
export function resetCircuitBreakers(): void {
  circuitBreakers.clear();
  healthCache.clear();
}

export type LordModelGateway = (candidate: Candidate) => LanguageModel;

// Build a gateway that resolves any Candidate to the matching provider
// instance from the configured state. Throws when the candidate's provider is
// not configured (missing/invalid key) so the caller can fall back.
export function createLordGateway(state: LordProvidersState): LordModelGateway {
  return (candidate: Candidate): LanguageModel => {
    const prov = state.providers[candidate.provider];
    if (!prov) {
      throw new OpenRouterClientError(
        `${candidate.provider} is not configured (missing or invalid API key)`,
        {
          kind: "api",
          status: 401,
          body: JSON.stringify({ provider: candidate.provider, modelId: candidate.modelId }),
        },
      );
    }
    return prov(candidate.modelId);
  };
}

export interface StreamWithFallbackOptions {
  gateway: LordModelGateway;
  state: LordProvidersState;
  mode: LordMode;
  explicitModelId?: string;
  system: string;
  messages: ModelMessage[];
  requestId: string;
  maxOutputTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  abortSignal?: AbortSignal;
  onTokenUsage?: (event: TokenUsageEvent) => void;
}

export interface StreamWithFallbackResult {
  result: Awaited<ReturnType<typeof streamText>>;
  model: string;
  provider: ProviderName;
  attempts: ModelAttempt[];
  /** Milliseconds from streamText call until first chunk arrives (TTFT). */
  ttftMs: number;
  /** Milliseconds from first chunk until stream end. */
  streamMs: number;
}

function logGateway(event: string, payload: Record<string, unknown>) {
  console.info(JSON.stringify({ event, ...payload }));
}

// Tries each candidate model for `mode` in order. A candidate is validated with
// a cheap pre-flight call; on failure its error is classified:
//   - retryable  -> log and move to the next candidate
//   - non-retryable -> stop immediately and re-throw the original error
// The first candidate that passes the probe is returned so the caller can
// either stream it or complete it. Throws only when every candidate fails (or a
// non-retryable error is hit), so the user never sees an error unless all models
// are down.

// ---------------------------------------------------------------------------
// Model probe cache (module-level, shared across requests in the same process)
// ---------------------------------------------------------------------------
// Caches the first-working candidate per `mode` so we skip re-probing on every
// request. Positive results are cached for PROBE_CACHE_TTL_MS; a failure
// immediately invalidates the entry so we don't blindly stream to a dead model.

const PROBE_CACHE_TTL_MS = 45_000; // 45 seconds
interface ProbeCacheEntry {
  provider: ProviderName;
  model: string;
  ts: number;
}

const probeCache = new Map<string, ProbeCacheEntry>();

function getCachedCandidate(mode: string): ProbeCacheEntry | null {
  const entry = probeCache.get(mode);
  if (!entry) return null;
  if (Date.now() - entry.ts > PROBE_CACHE_TTL_MS) {
    probeCache.delete(mode);
    return null;
  }
  return entry;
}

function setCachedCandidate(mode: string, entry: ProbeCacheEntry): void {
  probeCache.set(mode, entry);
}

function invalidateCachedCandidate(mode: string): void {
  probeCache.delete(mode);
}

// Exponential backoff retry for transient probe/stream errors. Returns the
// delay (ms) before the next retry attempt, or 0 if no more retries remain.
function probeBackoff(attempt: number, maxAttempts: number): number {
  if (attempt >= maxAttempts) return 0;
  return Math.min(1000 * 2 ** attempt, 4_000);
}

export async function findFirstWorkingModel(opts: StreamWithFallbackOptions): Promise<{
  candidate: Candidate;
  provider: ProviderName;
  attempts: ModelAttempt[];
  probeMs: number;
}> {
  const { mode, requestId, state } = opts;
  const resolvedExplicit = opts.explicitModelId ? resolveCandidate(opts.explicitModelId) : null;
  const candidates = getModeCandidates(
    mode,
    resolvedExplicit ? undefined : opts.explicitModelId,
    resolvedExplicit?.provider,
    resolvedExplicit?.modelId,
  ).filter((c) => !isProviderCircuitOpen(c.provider) && state.meta[c.provider]?.hasKey);
  const modeLabel = LORD_MODE_LABELS[mode];
  const probeStart = performance.now();

  // Fast-path: if we have a fresh cache hit for this mode and its provider is
  // still healthy + configured, use it directly (unless an explicit modelId was
  // requested, in which case we must probe it).
  const cached = opts.explicitModelId ? null : getCachedCandidate(mode);
  if (cached && !opts.explicitModelId) {
    const stillConfigured =
      state.meta[cached.provider]?.hasKey && !isProviderCircuitOpen(cached.provider);
    if (stillConfigured) {
      logGateway("ai_probe_cache_hit", {
        requestId,
        mode,
        provider: cached.provider,
        model: cached.model,
      });
      return {
        candidate: { provider: cached.provider, modelId: cached.model },
        provider: cached.provider,
        attempts: [],
        probeMs: 0,
      };
    }
    invalidateCachedCandidate(mode);
  }

  console.info(`Mode: ${modeLabel}`);

  const attempts: ModelAttempt[] = [];
  const configuredProviders = getConfiguredProviders();

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const { provider, modelId } = candidate;
    const attemptNum = i + 1;
    console.info(`Attempt ${attemptNum}:\n${provider}:${modelId}`);
    logGateway("ai_provider_selected", {
      requestId,
      mode,
      attempt: attemptNum,
      provider,
      model: modelId,
    });

    // Skip candidates whose provider has no valid key configured.
    if (!state.meta[provider]?.hasKey) {
      const attempt: ModelAttempt = {
        model: modelId,
        status: 0,
        reason: "Provider not configured (missing API key)",
        retryable: false,
        providerMessage: `Provider "${provider}" has no valid API key`,
        timestamp: Date.now(),
      };
      attempts.push(attempt);
      continue;
    }

    // Exponential retry for transient probe failures: a provider may be
    // flapping, so we retry a couple of times before giving up on it.
    const maxProbeAttempts = 2;
    let probed = false;
    for (let probeTry = 0; probeTry < maxProbeAttempts && !probed; probeTry++) {
      try {
        await generateText({
          model: opts.gateway(candidate),
          system: "Reply with OK",
          messages: [{ role: "user", content: "OK" }],
          maxOutputTokens: PROBE_MAX_OUTPUT_TOKENS,
          temperature: 0,
          maxRetries: 0,
          timeout: PROBE_TIMEOUT_MS,
          abortSignal: opts.abortSignal,
        });
        probed = true;
      } catch (err) {
        const classification = classifyModelError(err);
        const errProvider = getProviderFromError(err) ?? provider;
        const attempt: ModelAttempt = {
          model: modelId,
          status: classification.status ?? 0,
          reason: REASON_LABELS[classification.reason] ?? classification.reason,
          retryable: classification.retryable,
          providerMessage: classification.providerMessage,
          errorCode: classification.errorCode,
          requestId: classification.requestId,
          timestamp: Date.now(),
        };
        attempts.push(attempt);
        console.info(
          `Failed:\n${attempt.reason} (status: ${attempt.status}, retryable: ${attempt.retryable})`,
        );

        // Record circuit-breaker / health state for the failing provider.
        recordProviderFailure(errProvider, attempt.providerMessage ?? attempt.reason);

        if (!classification.retryable) {
          // Non-retryable (e.g. invalid key) for THIS provider — move on to the
          // next candidate rather than aborting the whole request.
          console.warn(`Skipping invalid model ${modelId}: ${classification.providerMessage}`);
          break;
        }

        // Retryable: back off briefly and retry the same candidate.
        const delay = probeBackoff(probeTry, maxProbeAttempts);
        if (delay > 0) {
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        // No retries left: fall through to the next candidate.
        break;
      }
    }

    if (probed) {
      // Success: cache this candidate as the preferred choice for this mode.
      setCachedCandidate(mode, { provider, model: modelId, ts: Date.now() });
      recordProviderSuccess(provider);
      console.info("Success");
      const probeMs = Math.round(performance.now() - probeStart);
      logGateway("ai_probe_complete", {
        requestId,
        mode,
        provider,
        model: modelId,
        probeMs,
        attempts: attempts.length,
      });
      return { candidate, provider, attempts, probeMs };
    }
  }

  // All probes failed: invalidate any stale cache entry for this mode so the
  // next request starts fresh instead of blindly streaming to a dead model.
  invalidateCachedCandidate(mode);
  const probeMs = Math.round(performance.now() - probeStart);
  console.error(
    JSON.stringify({
      event: "lord_mode_exhausted",
      requestId,
      mode,
      configuredProviders,
      attempts,
      probeMs,
    }),
  );
  const exhausted = new Error(`All models failed for mode "${mode}".`);
  (exhausted as unknown as { lordAttempts: ModelAttempt[] }).lordAttempts = attempts;
  throw exhausted;
}

export async function streamWithFallback(
  opts: StreamWithFallbackOptions,
): Promise<StreamWithFallbackResult> {
  const { mode, requestId, state } = opts;
  const { candidate, provider, attempts, probeMs } = await findFirstWorkingModel(opts);
  const modelId = candidate.modelId;

  let firstChunkLogged = false;
  const streamStart = performance.now();
  let firstChunkTime = 0;
  let streamEndTime = 0;

  const providerTimeout = state.meta[provider]?.timeoutMs ?? OPENROUTER_TIMEOUT_MS;

  const result = streamText({
    model: opts.gateway(candidate),
    system: opts.system,
    messages: opts.messages,
    maxOutputTokens: opts.maxOutputTokens ?? 1024,
    temperature: opts.temperature ?? 0.7,
    maxRetries: 2,
    timeout: opts.timeoutMs ?? providerTimeout,
    abortSignal: opts.abortSignal,
    experimental_onStart: () => {
      logGateway("ai_stream_start", {
        requestId,
        mode,
        provider,
        model: modelId,
        probeMs,
      });
    },
    onChunk: ({ chunk }) => {
      if (!firstChunkLogged && chunk.type === "text-delta") {
        firstChunkLogged = true;
        firstChunkTime = performance.now();
        const ttft = Math.round(firstChunkTime - streamStart);
        logGateway("ai_stream_first_chunk", {
          requestId,
          mode,
          provider,
          model: modelId,
          ttftMs: ttft,
          probeMs,
        });
      }
    },
    onError: ({ error }) => {
      const errProvider = getProviderFromError(error) ?? provider;
      recordProviderFailure(errProvider, error instanceof Error ? error.message : String(error));
      console.error(
        JSON.stringify({
          event: "ai_stream_error",
          requestId,
          mode,
          provider,
          model: modelId,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    },
    onFinish: ({ finishReason, usage }) => {
      streamEndTime = performance.now();
      const ttftMs = firstChunkTime > 0 ? Math.round(firstChunkTime - streamStart) : 0;
      const streamMs = firstChunkTime > 0 ? Math.round(streamEndTime - firstChunkTime) : 0;
      const cost = estimateCost(modelId, usage.inputTokens ?? 0, usage.outputTokens ?? 0);
      recordProviderSuccess(provider);
      logGateway("ai_stream_end", {
        requestId,
        mode,
        provider,
        model: modelId,
        finishReason,
        probeMs,
        ttftMs,
        streamMs,
        usage: {
          inputTokens: usage.inputTokens ?? 0,
          outputTokens: usage.outputTokens ?? 0,
          totalTokens: usage.totalTokens ?? 0,
          reasoningTokens: usage.outputTokenDetails?.reasoningTokens ?? 0,
          cachedInputTokens: usage.inputTokenDetails?.cacheReadTokens ?? 0,
          cost,
        },
      });
      opts.onTokenUsage?.({
        requestId,
        model: modelId,
        mode,
        finishReason,
        inputTokens: usage.inputTokens ?? 0,
        outputTokens: usage.outputTokens ?? 0,
        reasoningTokens: usage.outputTokenDetails?.reasoningTokens ?? 0,
        cachedInputTokens: usage.inputTokenDetails?.cacheReadTokens ?? 0,
        totalTokens: usage.totalTokens ?? 0,
        cost,
        timestamp: Date.now(),
      });
    },
  });

  const ttftMs = firstChunkTime > 0 ? Math.round(firstChunkTime - streamStart) : 0;
  const finalStreamMs =
    firstChunkTime > 0 ? Math.round((streamEndTime || performance.now()) - firstChunkTime) : 0;

  return { result, model: modelId, provider, attempts, ttftMs, streamMs: finalStreamMs };
}

// Non-streaming variant used for diagnostics: verifies normal completions work
// before relying on streaming.
export async function generateTextWithFallback(opts: StreamWithFallbackOptions): Promise<{
  text: string;
  candidate: Candidate;
  provider: ProviderName;
  attempts: ModelAttempt[];
}> {
  const { candidate, provider, attempts } = await findFirstWorkingModel(opts);
  const modelId = candidate.modelId;
  const providerTimeout = opts.state.meta[provider]?.timeoutMs ?? OPENROUTER_TIMEOUT_MS;
  const { text } = await generateText({
    model: opts.gateway(candidate),
    system: opts.system,
    messages: opts.messages,
    maxOutputTokens: opts.maxOutputTokens ?? 1024,
    temperature: opts.temperature ?? 0.7,
    maxRetries: 2,
    timeout: opts.timeoutMs ?? providerTimeout,
    abortSignal: opts.abortSignal,
  });
  return { text, candidate, provider, attempts };
}

// ---------------------------------------------------------------------------
// Standalone raw connection test (task 9). Uses the global fetch directly so
// the result is isolated from the AI-SDK chat pipeline. If this fails, the
// problem is outside the chat system (key, network, or OpenRouter itself).
// ---------------------------------------------------------------------------

export interface OpenRouterTestResult {
  ok: boolean;
  url: string;
  model: string;
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  rawText?: string;
  json?: unknown;
  error?: { name: string; message: string; stack?: string };
  diagnostics: ReturnType<typeof getLordEnvironmentDiagnostics>;
}

export async function testOpenRouterConnection(opts: {
  apiKey: string;
  model?: string;
  prompt?: string;
}): Promise<OpenRouterTestResult> {
  const model = opts.model ?? "openai/gpt-4o-mini";
  const url = `${OPENROUTER_BASE_URL}${OPENROUTER_CHAT_PATH}`;
  const body = {
    model,
    stream: false,
    messages: [{ role: "user", content: opts.prompt ?? "Say hello." }],
    max_tokens: 512,
    temperature: 0,
  };
  const diagnostics = getLordEnvironmentDiagnostics();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": OPENROUTER_REFERER,
        "X-Title": OPENROUTER_TITLE,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const rawText = await res.text();
    const responseHeaders: Record<string, string> = {};
    if (typeof res.headers?.entries === "function") {
      for (const [k, v] of res.headers.entries()) responseHeaders[k] = v;
    }

    let json: unknown;
    try {
      json = JSON.parse(rawText);
    } catch {
      json = undefined;
    }

    return {
      ok: res.ok,
      url,
      model,
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
      rawText,
      json,
      diagnostics,
    };
  } catch (error) {
    const name = error instanceof Error ? error.name : typeof error;
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    return {
      ok: false,
      url,
      model,
      error: { name, message, stack },
      diagnostics,
    };
  } finally {
    clearTimeout(timer);
  }
}

export {
  LORD_MODELS,
  LORD_SYSTEM_PROMPT,
  getLordModelCandidates,
  buildCandidates,
  getModeCandidates,
  classifyModelError,
  type LordMode,
  type ModelAttempt,
  type ProviderName,
  type Candidate,
  PROVIDER_CONFIG,
} from "./lord-config";
