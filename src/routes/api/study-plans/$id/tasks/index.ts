/* eslint-disable @typescript-eslint/no-explicit-any -- server context receives the migration-defined database client. */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireSupabaseRequestAuth } from "@/integrations/supabase/auth-middleware";
import { apiErrorResponse, apiOkResponse, apiNoContentResponse } from "@/lib/api-error";
import type { SupabaseClient } from "@supabase/supabase-js";

const AddTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  conceptId: z.string().optional(),
  taskType: z.enum(["learn", "practice", "review", "quiz", "flashcards", "custom"]),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  estimatedMinutes: z.number().int().min(5).max(480),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  notes: z.string().optional(),
});

export const Route = createFileRoute("/api/study-plans/$id/tasks/")({
  server: {
    middleware: [requireSupabaseRequestAuth],
    handlers: {
      POST: async ({ params, request, context }) => {
        const requestId = crypto.randomUUID();
        const auth = context as { userId?: string; supabase?: SupabaseClient<any> };
        if (!auth.userId || !auth.supabase)
          return apiErrorResponse(401, "AI_AUTH_ERROR", "Sign in required.", requestId);

        const body = await request.json().catch(() => null);
        const parsed = AddTaskSchema.safeParse(body);
        if (!parsed.success)
          return apiErrorResponse(400, "INVALID_REQUEST", "Invalid task data.", requestId);

        const db = auth.supabase;
        const userId = auth.userId;

        const { data: plan } = await db
          .from("learning_plans")
          .select("id")
          .eq("id", params.id)
          .eq("user_id", userId)
          .maybeSingle();

        if (!plan) return apiErrorResponse(404, "NOT_FOUND", "Plan not found.", requestId);

        const maxPos = await db
          .from("learning_plan_tasks")
          .select("position", { count: "exact", head: false })
          .eq("plan_id", params.id)
          .order("position", { ascending: false })
          .limit(1)
          .then((r: any) => r.data?.[0]?.position ?? -1);

        const { data, error } = await db
          .from("learning_plan_tasks")
          .insert({
            plan_id: params.id,
            user_id: userId,
            concept_id: parsed.data.conceptId ?? null,
            title: parsed.data.title,
            description: parsed.data.description ?? null,
            task_type: parsed.data.taskType,
            due_at: new Date(parsed.data.scheduledDate).toISOString(),
            estimated_minutes: parsed.data.estimatedMinutes,
            priority: parsed.data.priority,
            status: "pending",
            position: maxPos + 1,
            notes: parsed.data.notes ?? null,
          })
          .select("*")
          .single();

        if (error) return apiErrorResponse(500, "DB_ERROR", error.message, requestId);
        return apiOkResponse(data, 201);
      },
    },
  },
});
