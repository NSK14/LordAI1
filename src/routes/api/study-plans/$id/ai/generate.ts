/* eslint-disable @typescript-eslint/no-explicit-any -- server context receives the migration-defined database client. */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { requireSupabaseRequestAuth } from "@/integrations/supabase/auth-middleware";
import { apiErrorResponse, apiOkResponse } from "@/lib/api-error";
import type { SupabaseClient } from "@supabase/supabase-js";

const GenerateSchema = z.object({
  conceptIds: z.array(z.string()).min(1).max(12),
  weeklyMinutes: z.number().int().min(30).max(1680).default(180),
  examDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  planName: z.string().min(1).max(200).optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dailyMinutes: z.number().int().min(5).max(480).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
});

function getProvider() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("AI not configured");
  return createOpenAICompatible({
    name: "openrouter",
    apiKey,
    baseURL: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
  });
}

async function resolveConcept(db: any, conceptId: string) {
  const { data: catalog } = await db
    .from("learning_concepts")
    .select("*")
    .eq("id", conceptId)
    .maybeSingle();
  if (catalog) return { ...catalog, is_custom: false };
  const { data: custom } = await db
    .from("learning_user_concepts")
    .select("*")
    .eq("id", conceptId)
    .maybeSingle();
  if (!custom) return null;
  return { ...custom, is_custom: true };
}

export const Route = createFileRoute("/api/study-plans/$id/ai/generate")({
  server: {
    middleware: [requireSupabaseRequestAuth],
    handlers: {
      POST: async ({ params, request, context }) => {
        const requestId = crypto.randomUUID();
        const auth = context as { userId?: string; supabase?: SupabaseClient<any> };
        if (!auth.userId || !auth.supabase)
          return apiErrorResponse(401, "AI_AUTH_ERROR", "Sign in required.", requestId);

        const body = await request.json().catch(() => null);
        const parsed = GenerateSchema.safeParse(body);
        if (!parsed.success)
          return apiErrorResponse(400, "INVALID_REQUEST", "Invalid generation request.", requestId);

        const db = auth.supabase;
        const userId = auth.userId;

        const concepts = await Promise.all(
          parsed.data.conceptIds.map((id) => resolveConcept(db, id)),
        );
        const validConcepts = concepts.filter((c): c is any => c !== null);

        const now = new Date();
        const startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : now;
        const targetDate = parsed.data.targetDate
          ? new Date(parsed.data.targetDate)
          : new Date(startDate.getTime() + 30 * 86400000);
        const daysAvailable = Math.max(
          1,
          Math.ceil((targetDate.getTime() - startDate.getTime()) / 86400000),
        );
        const totalMinutes = parsed.data.dailyMinutes
          ? parsed.data.dailyMinutes * daysAvailable
          : parsed.data.weeklyMinutes * Math.max(1, Math.ceil(daysAvailable / 7));

        const { data: mastery } = await db
          .from("learning_mastery")
          .select("*")
          .eq("user_id", userId);

        const masteryMap = new Map((mastery ?? []).map((m: any) => [m.concept_id, m]));

        const tasks: any[] = [];
        const taskTypes = ["learn", "practice", "review"] as const;
        let pos = 0;

        for (const concept of validConcepts) {
          const m = masteryMap.get(concept.id);
          const score = m?.score ?? 0.3;
          const baseMinutes = concept.estimated_study_minutes ?? 20;
          const typeIndex = score < 0.4 ? 0 : score < 0.7 ? 1 : 2;
          const taskType = taskIndexToTaskType(typeIndex);

          tasks.push({
            concept_id: concept.id,
            title: `${capitalize(taskType)}: ${concept.title}`,
            description: concept.description ?? null,
            task_type: taskType,
            due_at: new Date(startDate.getTime() + (pos % daysAvailable) * 86400000).toISOString(),
            estimated_minutes: Math.max(10, baseMinutes),
            priority: score < 0.4 ? "high" : score < 0.7 ? "medium" : "low",
            status: "pending",
            position: pos,
            notes: null,
          });
          pos++;
        }

        const { data: existingPlan } = await db
          .from("learning_plans")
          .select("id")
          .eq("id", params.id)
          .eq("user_id", userId)
          .maybeSingle();

        if (!existingPlan) {
          return apiErrorResponse(404, "NOT_FOUND", "Plan not found.", requestId);
        }

        await db
          .from("learning_plan_tasks")
          .delete()
          .eq("plan_id", params.id)
          .eq("user_id", userId);

        const { error: insertError } = await db.from("learning_plan_tasks").insert(
          tasks.map((t) => ({
            ...t,
            plan_id: params.id,
            user_id: userId,
          })),
        );

        if (insertError) return apiErrorResponse(500, "DB_ERROR", insertError.message, requestId);

        const updatePayload: Record<string, unknown> = {
          source: "ai",
          updated_at: new Date().toISOString(),
        };
        if (parsed.data.planName) updatePayload.title = parsed.data.planName;
        if (parsed.data.startDate) updatePayload.starts_on = parsed.data.startDate;
        if (parsed.data.targetDate) updatePayload.ends_on = parsed.data.targetDate;
        if (parsed.data.dailyMinutes) updatePayload.daily_minutes = parsed.data.dailyMinutes;
        const { data: updatedPlan } = await db
          .from("learning_plans")
          .update(updatePayload)
          .eq("id", params.id)
          .eq("user_id", userId)
          .select("*")
          .single();

        return apiOkResponse({ plan: updatedPlan, tasks, count: tasks.length });
      },
    },
  },
});

function taskIndexToTaskType(
  index: number,
): "learn" | "practice" | "review" | "quiz" | "flashcards" | "custom" {
  const types: Array<"learn" | "practice" | "review" | "quiz" | "flashcards" | "custom"> = [
    "learn",
    "practice",
    "review",
    "quiz",
    "flashcards",
    "custom",
  ];
  return types[index] ?? "learn";
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
