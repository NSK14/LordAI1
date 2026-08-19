/* eslint-disable @typescript-eslint/no-explicit-any -- server context receives the migration-defined database client. */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { requireSupabaseRequestAuth } from "@/integrations/supabase/auth-middleware";
import { apiErrorResponse } from "@/lib/api-error";
import { OPENROUTER_DEFAULT_MODEL } from "@/lib/openrouter-provider";

function getOpenRouterProvider() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("AI not configured");
  return createOpenAICompatible({
    name: "openrouter",
    apiKey,
    baseURL: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
  });
}

const MemoryRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("store"),
    memoryType: z.enum([
      "conversation",
      "mistake",
      "strength",
      "preference",
      "goal",
      "misconception",
    ]),
    conceptId: z.string().optional(),
    sessionId: z.string().uuid().optional(),
    content: z.record(z.string(), z.unknown()),
    summary: z.string().optional(),
    importance: z.number().min(0).max(1).optional(),
    confidence: z.number().min(0).max(1).optional(),
    tags: z.array(z.string()).optional(),
  }),
  z.object({
    action: z.literal("retrieve"),
    memoryType: z
      .enum(["conversation", "mistake", "strength", "preference", "goal", "misconception"])
      .optional(),
    conceptId: z.string().optional(),
    limit: z.number().int().min(1).max(100).optional(),
  }),
  z.object({
    action: z.literal("extract"),
    sessionId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("get_context"),
    conceptId: z.string().optional(),
    query: z.string().optional(),
    limit: z.number().int().min(1).max(20).optional(),
  }),
]);

export const Route = createFileRoute("/api/learning/memory")({
  server: {
    middleware: [requireSupabaseRequestAuth],
    handlers: {
      POST: async ({ request, context }) => {
        const requestId = crypto.randomUUID();
        const parsed = MemoryRequestSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success)
          return apiErrorResponse(400, "INVALID_REQUEST", "Invalid memory request.", requestId);

        const auth = context as { userId?: string; supabase?: { from: (table: string) => any } };
        if (!auth.userId || !auth.supabase)
          return apiErrorResponse(
            401,
            "AI_AUTH_ERROR",
            "Sign in to use learning tools.",
            requestId,
          );

        const db = auth.supabase;
        const userId = auth.userId;

        try {
          if (parsed.data.action === "store") {
            const { data, error } = await db
              .from("learning_memory")
              .insert({
                user_id: userId,
                memory_type: parsed.data.memoryType,
                concept_id: parsed.data.conceptId ?? null,
                session_id: parsed.data.sessionId ?? null,
                content: parsed.data.content,
                summary: parsed.data.summary ?? null,
                importance: parsed.data.importance,
                confidence: parsed.data.confidence,
                tags: parsed.data.tags,
              })
              .select()
              .single();

            if (error) throw error;
            return Response.json({ memory: data });
          }

          if (parsed.data.action === "retrieve") {
            let query = db
              .from("learning_memory")
              .select("*")
              .eq("user_id", userId)
              .order("created_at", { ascending: false })
              .limit(parsed.data.limit);

            if (parsed.data.memoryType) query = query.eq("memory_type", parsed.data.memoryType);
            if (parsed.data.conceptId) query = query.eq("concept_id", parsed.data.conceptId);

            const { data, error } = await query;
            if (error) throw error;
            return Response.json({ memories: data ?? [] });
          }

          if (parsed.data.action === "extract") {
            // Get session messages
            const { data: session } = await db
              .from("learning_sessions")
              .select("*")
              .eq("id", parsed.data.sessionId)
              .eq("user_id", userId)
              .maybeSingle();

            if (!session)
              return apiErrorResponse(404, "NOT_FOUND", "Session not found.", requestId);

            const { data: messages } = await db
              .from("learning_messages")
              .select("*")
              .eq("session_id", parsed.data.sessionId)
              .eq("user_id", userId)
              .order("created_at", { ascending: true });

            if (!messages || messages.length === 0) return Response.json({ memories: [] });

            // Extract memories using AI
            const conversation = messages
              .map((m: any) => `${m.role.toUpperCase()}: ${m.content}`)
              .join("\n");

            const provider = getOpenRouterProvider();
            const { text } = await generateText({
              model: provider(OPENROUTER_DEFAULT_MODEL),
              system: `You are a learning memory extractor. Analyze the conversation and extract structured memories. Output ONLY a JSON array of memory objects. No markdown. No extra text.`,
              messages: [
                {
                  role: "user",
                  content: `Conversation:\n${conversation}\n\nExtract memories as JSON array with this exact shape:
[{
  "memory_type": "conversation|mistake|strength|preference|goal|misconception",
  "concept_id": "string|null",
  "content": {},
  "summary": "string",
  "importance": 0.0-1.0,
  "confidence": 0.0-1.0,
  "tags": ["string"]
}]`,
                },
              ],
              maxOutputTokens: 2000,
              temperature: 0.3,
            });

            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (!jsonMatch) return Response.json({ memories: [] });

            try {
              const memories = JSON.parse(jsonMatch[0]);
              const saved = [];

              for (const mem of memories) {
                const { data, error } = await db
                  .from("learning_memory")
                  .insert({
                    user_id: userId,
                    ...mem,
                    session_id: parsed.data.sessionId,
                  })
                  .select()
                  .single();
                if (!error && data) saved.push(data);
              }

              return Response.json({ memories: saved, extracted: memories.length });
            } catch {
              return Response.json({ memories: [] });
            }
          }

          if (parsed.data.action === "get_context") {
            // Get relevant memories for a concept or query
            let query = db
              .from("learning_memory")
              .select("*")
              .eq("user_id", userId)
              .order("importance", { ascending: false })
              .order("created_at", { ascending: false })
              .limit(parsed.data.limit);

            if (parsed.data.conceptId) {
              query = query.eq("concept_id", parsed.data.conceptId);
            }

            const { data, error } = await query;
            if (error) throw error;

            return Response.json({ memories: data ?? [] });
          }

          return apiErrorResponse(400, "INVALID_ACTION", "Unknown action.", requestId);
        } catch (err) {
          console.error("Memory error:", err);
          return apiErrorResponse(500, "INTERNAL_ERROR", "Memory service unavailable.", requestId);
        }
      },
    },
  },
});
