/* eslint-disable @typescript-eslint/no-explicit-any -- server context receives the migration-defined database client. */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { requireSupabaseRequestAuth } from "@/integrations/supabase/auth-middleware";
import { apiErrorResponse, apiOkResponse } from "@/lib/api-error";
import type { SupabaseClient } from "@supabase/supabase-js";
import { OPENROUTER_DEFAULT_MODEL } from "@/lib/openrouter-provider";

const SuggestSchema = z.object({
  userMessage: z.string().min(1).max(2000),
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

export const Route = createFileRoute("/api/study-plans/$id/ai/suggest")({
  server: {
    middleware: [requireSupabaseRequestAuth],
    handlers: {
      POST: async ({ params, request, context }) => {
        const requestId = crypto.randomUUID();
        const auth = context as { userId?: string; supabase?: SupabaseClient<any> };
        if (!auth.userId || !auth.supabase)
          return apiErrorResponse(401, "AI_AUTH_ERROR", "Sign in required.", requestId);

        const body = await request.json().catch(() => null);
        const parsed = SuggestSchema.safeParse(body);
        if (!parsed.success)
          return apiErrorResponse(400, "INVALID_REQUEST", "Invalid request.", requestId);

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
          .order("position")
          .order("due_at");

        const planContext = {
          title: plan.title,
          status: plan.status,
          startDate: plan.starts_on,
          targetDate: plan.ends_on,
          dailyMinutes: plan.daily_minutes,
          source: plan.source,
          taskCount: tasks?.length ?? 0,
          completedCount: tasks?.filter((t: any) => t.status === "completed").length ?? 0,
          pendingCount: tasks?.filter((t: any) => t.status === "pending").length ?? 0,
        };

        const systemPrompt = `You are LORD, an intelligent study-planning assistant.
You receive a study plan and a user request. You must propose changes as structured JSON.
Do NOT apply changes. Only describe what you would change and why.

PLAN CONTEXT:
${JSON.stringify(planContext, null, 2)}

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
  })),
  null,
  2,
)}

User request: "${parsed.data.userMessage}"

Return STRICT JSON only (no markdown, no extra text):
{
  "summary": "Brief explanation of what you would change",
  "changes": [
    {
      "action": "reschedule",
      "taskId": "task-id-here",
      "from": "2026-08-15",
      "to": "2026-08-17",
      "reason": "why"
    }
  ],
  "smartSuggestions": ["suggestion 1", "suggestion 2"]
}`;

        try {
          const { text } = await generateText({
            model: getProvider()(OPENROUTER_DEFAULT_MODEL),
            system: systemPrompt,
            messages: [{ role: "user", content: "Suggest changes to my study plan." }],
            maxOutputTokens: 1200,
            temperature: 0.5,
          });

          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            return apiOkResponse({ summary: text, changes: [], smartSuggestions: [] });
          }

          const parsedResult = JSON.parse(jsonMatch[0]);
          return apiOkResponse({
            summary: parsedResult.summary ?? "Here are my suggested changes.",
            changes: Array.isArray(parsedResult.changes) ? parsedResult.changes : [],
            smartSuggestions: Array.isArray(parsedResult.smartSuggestions)
              ? parsedResult.smartSuggestions
              : [],
          });
        } catch {
          return apiOkResponse({
            summary: "I couldn't analyze the plan right now. Please try again.",
            changes: [],
            smartSuggestions: [],
          });
        }
      },
    },
  },
});
