import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { generateText } from "ai";
import { createLordProviders, type LordProvidersState } from "@/lib/ai-gateway.server";
import { GATEWAY_CONFIG } from "@/lib/gateway-config";
import { createLogger } from "@/lib/gateway-logger";
import { requireSupabaseRequestAuth } from "@/integrations/supabase/auth-middleware";
import { getSafeErrorMessage } from "@/lib/api-error";
import { generateChatTitle } from "@/lib/chat-title";

const TitleRequestSchema = z.object({
  prompt: z.string().min(1).max(10000),
});

const TITLE_SYSTEM_PROMPT = `You are a conversation title generator. Generate a concise, human-readable title (2-5 words, Title Case, no punctuation, no quotes, no emojis) for the following user message. Output ONLY the title text.`;

function getTitleCandidates(lordState: LordProvidersState) {
  return [
    { name: "gemini" as const, provider: lordState.providers.gemini, model: "gemini-2.5-flash" },
    { name: "openai" as const, provider: lordState.providers.openai, model: "gpt-4o-mini" },
  ];
}

async function generateTitleWithAI(
  prompt: string,
  lordState: LordProvidersState,
  logger: ReturnType<typeof createLogger>,
): Promise<string> {
  const trimmed = prompt.trim();
  const candidates = getTitleCandidates(lordState);

  for (const { name, provider, model } of candidates) {
    if (!provider) continue;

    try {
      const result = await generateText({
        model: provider(model),
        system: TITLE_SYSTEM_PROMPT,
        prompt: trimmed.slice(0, 500),
        maxOutputTokens: 20,
        temperature: 0.1,
      });

      const title = result.text.trim().replace(/["'`]/g, "").slice(0, 60);
      if (title && title.length >= 2 && title.split(/\s+/).length <= 6) {
        return title;
      }
    } catch (error) {
      logger.warn("title_generation_provider_error", {
        provider: name,
        error: getSafeErrorMessage(error),
      });
    }
  }

  throw new Error("All title generation providers failed");
}

export const Route = createFileRoute("/api/title")({
  server: {
    middleware: [requireSupabaseRequestAuth],
    handlers: {
      POST: async ({ request }) => {
        const requestId = crypto.randomUUID();
        try {
          const body = TitleRequestSchema.parse(await request.json());
          const logger = createLogger(GATEWAY_CONFIG);
          const lordState: LordProvidersState = createLordProviders(logger);

          let title: string;
          try {
            title = await generateTitleWithAI(body.prompt, lordState, logger);
          } catch {
            title = generateChatTitle(body.prompt) ?? "New Chat";
          }

          return Response.json(
            { title },
            {
              headers: { "Cache-Control": "no-store" },
            },
          );
        } catch (error) {
          return Response.json(
            {
              error: {
                code: "INVALID_REQUEST",
                message: getSafeErrorMessage(error),
                requestId,
              },
            } as {
              error: {
                code: string;
                message: string;
                requestId: string;
              };
            },
            {
              status: 400,
              headers: { "Cache-Control": "no-store" },
            },
          );
        }
      },
    },
  },
});
