/* eslint-disable @typescript-eslint/no-explicit-any -- server context receives the migration-defined database client. */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { requireSupabaseRequestAuth } from "@/integrations/supabase/auth-middleware";
import { apiErrorResponse } from "@/lib/api-error";

function getOpenRouterProvider() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("AI not configured");
  return createOpenAICompatible({
    name: "openrouter",
    apiKey,
    baseURL: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
  });
}

const WhiteboardRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    conceptId: z.string().optional(),
    sessionId: z.string().uuid().optional(),
    title: z.string().min(1).max(200),
    canvasData: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({
    action: z.literal("update"),
    whiteboardId: z.string().uuid(),
    canvasData: z.record(z.string(), z.unknown()),
    aiAnnotations: z.array(z.record(z.string(), z.unknown())).optional(),
  }),
  z.object({
    action: z.literal("annotate"),
    whiteboardId: z.string().uuid(),
    canvasData: z.record(z.string(), z.unknown()),
    instruction: z.string().min(1),
  }),
  z.object({
    action: z.literal("get"),
    whiteboardId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("list"),
    conceptId: z.string().optional(),
    limit: z.number().int().min(1).max(50).optional(),
  }),
  z.object({
    action: z.literal("delete"),
    whiteboardId: z.string().uuid(),
  }),
]);

export const Route = createFileRoute("/api/learning/whiteboard")({
  server: {
    middleware: [requireSupabaseRequestAuth],
    handlers: {
      POST: async ({ request, context }) => {
        const requestId = crypto.randomUUID();
        const parsed = WhiteboardRequestSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success)
          return apiErrorResponse(400, "INVALID_REQUEST", "Invalid whiteboard request.", requestId);

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
          if (parsed.data.action === "create") {
            const { data, error } = await db
              .from("learning_whiteboards")
              .insert({
                user_id: userId,
                concept_id: parsed.data.conceptId,
                session_id: parsed.data.sessionId,
                title: parsed.data.title,
                canvas_data: parsed.data.canvasData,
              })
              .select()
              .single();

            if (error) throw error;
            return Response.json({ whiteboard: data });
          }

          if (parsed.data.action === "update") {
            const updates: Record<string, unknown> = {
              canvas_data: parsed.data.canvasData,
              updated_at: new Date().toISOString(),
            };
            if (parsed.data.aiAnnotations !== undefined) {
              updates.ai_annotations = parsed.data.aiAnnotations;
            }

            const { data, error } = await db
              .from("learning_whiteboards")
              .update(updates)
              .eq("id", parsed.data.whiteboardId)
              .eq("user_id", userId)
              .select()
              .single();

            if (error) throw error;
            if (!data)
              return apiErrorResponse(404, "NOT_FOUND", "Whiteboard not found.", requestId);
            return Response.json({ whiteboard: data });
          }

          if (parsed.data.action === "annotate") {
            // Get current whiteboard
            const { data: wb } = await db
              .from("learning_whiteboards")
              .select("*")
              .eq("id", parsed.data.whiteboardId)
              .eq("user_id", userId)
              .maybeSingle();

            if (!wb) return apiErrorResponse(404, "NOT_FOUND", "Whiteboard not found.", requestId);

            // Generate AI annotations based on canvas content and instruction
            const provider = getOpenRouterProvider();
            const conceptInfo = wb.concept_id
              ? await db.from("learning_concepts").select("*").eq("id", wb.concept_id).maybeSingle()
              : null;

            const { text } = await generateText({
              model: provider("openai/gpt-4o-mini"),
              system: `You are an AI whiteboard assistant for ${conceptInfo?.data?.title ?? "learning"}. Analyze the canvas and provide helpful annotations. Return JSON array of annotation objects.`,
              messages: [
                {
                  role: "user",
                  content: `Canvas data: ${JSON.stringify(parsed.data.canvasData).slice(0, 5000)}\n\nInstruction: ${parsed.data.instruction}\n\nReturn annotations as: [{"type":"text|arrow|highlight|shape","position":{"x":0,"y":0},"content":"...","style":{}}]`,
                },
              ],
              maxOutputTokens: 1000,
              temperature: 0.5,
            });

            let annotations: any[] = [];
            try {
              const jsonMatch = text.match(/\[[\s\S]*\]/);
              if (jsonMatch) annotations = JSON.parse(jsonMatch[0]);
            } catch {
              annotations = [
                {
                  type: "text",
                  position: { x: 100, y: 100 },
                  content: "AI annotation generated",
                  style: {},
                },
              ];
            }

            const updatedAnnotations = [...((wb.ai_annotations as any[]) || []), ...annotations];

            const { data, error } = await db
              .from("learning_whiteboards")
              .update({
                ai_annotations: updatedAnnotations,
                updated_at: new Date().toISOString(),
              })
              .eq("id", parsed.data.whiteboardId)
              .eq("user_id", userId)
              .select()
              .single();

            if (error) throw error;
            return Response.json({ whiteboard: data, newAnnotations: annotations });
          }

          if (parsed.data.action === "get") {
            const { data, error } = await db
              .from("learning_whiteboards")
              .select("*")
              .eq("id", parsed.data.whiteboardId)
              .eq("user_id", userId)
              .maybeSingle();

            if (error) throw error;
            if (!data)
              return apiErrorResponse(404, "NOT_FOUND", "Whiteboard not found.", requestId);
            return Response.json({ whiteboard: data });
          }

          if (parsed.data.action === "list") {
            let query = db
              .from("learning_whiteboards")
              .select("*")
              .eq("user_id", userId)
              .order("updated_at", { ascending: false })
              .limit(parsed.data.limit);

            if (parsed.data.conceptId) query = query.eq("concept_id", parsed.data.conceptId);

            const { data, error } = await query;
            if (error) throw error;
            return Response.json({ whiteboards: data ?? [] });
          }

          if (parsed.data.action === "delete") {
            const { error } = await db
              .from("learning_whiteboards")
              .delete()
              .eq("id", parsed.data.whiteboardId)
              .eq("user_id", userId);

            if (error) throw error;
            return Response.json({ success: true });
          }

          return apiErrorResponse(400, "INVALID_ACTION", "Unknown action.", requestId);
        } catch (err) {
          console.error("Whiteboard error:", err);
          return apiErrorResponse(
            500,
            "INTERNAL_ERROR",
            "Whiteboard service unavailable.",
            requestId,
          );
        }
      },
    },
  },
});
