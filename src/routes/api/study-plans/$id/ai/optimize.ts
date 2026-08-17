/* eslint-disable @typescript-eslint/no-explicit-any -- server context receives the migration-defined database client. */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { requireSupabaseRequestAuth } from "@/integrations/supabase/auth-middleware";
import { apiErrorResponse, apiOkResponse } from "@/lib/api-error";
import type { SupabaseClient } from "@supabase/supabase-js";

function getProvider() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("AI not configured");
  return createOpenAICompatible({
    name: "openrouter",
    apiKey,
    baseURL: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
  });
}

export const Route = createFileRoute("/api/study-plans/$id/ai/optimize")({
  server: {
    middleware: [requireSupabaseRequestAuth],
    handlers: {
      POST: async ({ params, context }) => {
        const requestId = crypto.randomUUID();
        const auth = context as { userId?: string; supabase?: SupabaseClient<any> };
        if (!auth.userId || !auth.supabase)
          return apiErrorResponse(401, "AI_AUTH_ERROR", "Sign in required.", requestId);

        const db = auth.supabase;

        const { data: plan } = await db
          .from("learning_plans")
          .select("*")
          .eq("id", params.id)
          .eq("user_id", auth.userId)
          .maybeSingle();

        if (!plan) return apiErrorResponse(404, "NOT_FOUND", "Plan not found.", requestId);

        const { data: tasks } = await db
          .from("learning_plan_tasks")
          .select("*")
          .eq("plan_id", params.id)
          .eq("user_id", auth.userId)
          .order("due_at")
          .order("position");

        const { data: mastery } = await db
          .from("learning_mastery")
          .select("*")
          .eq("user_id", auth.userId);

        const { data: profile } = await db
          .from("learning_profiles")
          .select("*")
          .eq("user_id", auth.userId)
          .maybeSingle();

        const completedCount = (tasks ?? []).filter((t: any) => t.status === "completed").length;
        const totalCount = (tasks ?? []).length;
        const weakConcepts = (mastery ?? []).filter((m: any) => m.score < 0.5);

        const dailyMap = new Map<string, number>();
        for (const t of tasks ?? []) {
          const day = new Date(t.due_at).toISOString().slice(0, 10);
          dailyMap.set(day, (dailyMap.get(day) ?? 0) + (t.estimated_minutes ?? 0));
        }
        const overloadedDays = Array.from(dailyMap.entries()).filter(
          ([, mins]) => mins > (plan.daily_minutes ?? 120),
        );

        const systemPrompt = `You are LORD, an intelligent study-planning assistant.
Analyze the current study plan and provide optimization recommendations.
Return STRICT JSON only (no markdown, no extra text):

{
  "summary": "Overall assessment of plan health",
  "health": {
    "workload": "optimal",
    "coverage": "good",
    "revision": "fair",
    "weakTopics": 3,
    "deadline": "on_track"
  },
  "recommendations": [
    "Add revision for Algebra",
    "Move Chemistry practice to Friday"
  ],
  "changes": [
    {
      "action": "reschedule",
      "taskId": "...",
      "from": "2026-08-15",
      "to": "2026-08-17",
      "reason": "..."
    }
  ]
}

PLAN:
${JSON.stringify(
  {
    title: plan.title,
    status: plan.status,
    startDate: plan.starts_on,
    targetDate: plan.ends_on,
    dailyMinutes: plan.daily_minutes,
    source: plan.source,
    totalTasks: totalCount,
    completedTasks: completedCount,
    progressPercent: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
  },
  null,
  2,
)}

TASKS (first 20):
${JSON.stringify(
  (tasks ?? []).slice(0, 20).map((t: any) => ({
    id: t.id,
    title: t.title,
    type: t.task_type,
    dueAt: t.due_at,
    minutes: t.estimated_minutes,
    status: t.status,
    priority: t.priority,
    conceptId: t.concept_id,
  })),
  null,
  2,
)}

WEAK CONCEPTS (mastery < 0.5):
${JSON.stringify(
  weakConcepts.slice(0, 10).map((m: any) => ({ conceptId: m.concept_id, score: m.score })),
  null,
  2,
)}

OVERLOADED DAYS:
${JSON.stringify(overloadedDays, null, 2)}

STUDENT PROFILE:
${JSON.stringify({ class: profile?.class, subjects: profile?.subjects, weeklyMinutes: profile?.weekly_minutes }, null, 2)}`;

        try {
          const { text } = await generateText({
            model: getProvider()("google/gemma-4-26b-a4b-it:free"),
            system: systemPrompt,
            messages: [{ role: "user", content: "Optimize my study plan." }],
            maxOutputTokens: 1500,
            temperature: 0.4,
          });

          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            return apiOkResponse({ summary: text, health: {}, changes: [], recommendations: [] });
          }

          const parsedResult = JSON.parse(jsonMatch[0]);
          return apiOkResponse({
            summary: parsedResult.summary ?? "Plan optimization complete.",
            health: parsedResult.health ?? {},
            changes: Array.isArray(parsedResult.changes) ? parsedResult.changes : [],
            recommendations: Array.isArray(parsedResult.recommendations)
              ? parsedResult.recommendations
              : [],
          });
        } catch {
          return apiOkResponse({
            summary: "I couldn't optimize the plan right now. Please try again.",
            health: {},
            changes: [],
            recommendations: [],
          });
        }
      },
    },
  },
});
