/* eslint-disable @typescript-eslint/no-explicit-any -- server context receives the migration-defined database client. */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireSupabaseRequestAuth } from "@/integrations/supabase/auth-middleware";
import { apiErrorResponse, apiOkResponse, apiNoContentResponse } from "@/lib/api-error";
import type { SupabaseClient } from "@supabase/supabase-js";

const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  conceptId: z.string().optional().nullable(),
  taskType: z.enum(["learn", "practice", "review", "quiz", "flashcards", "custom"]).optional(),
  scheduledDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  estimatedMinutes: z.number().int().min(5).max(480).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  status: z.enum(["pending", "in_progress", "completed", "skipped"]).optional(),
  position: z.number().int().min(0).optional(),
  notes: z.string().optional().nullable(),
});

export const Route = createFileRoute("/api/study-plans/$id/tasks/$taskId")({
  server: {
    middleware: [requireSupabaseRequestAuth],
    handlers: {
      PATCH: async ({ params, request, context }) => {
        const requestId = crypto.randomUUID();
        const auth = context as { userId?: string; supabase?: SupabaseClient<any> };
        if (!auth.userId || !auth.supabase)
          return apiErrorResponse(401, "AI_AUTH_ERROR", "Sign in required.", requestId);

        const body = await request.json().catch(() => null);
        const parsed = UpdateTaskSchema.safeParse(body);
        if (!parsed.success)
          return apiErrorResponse(400, "INVALID_REQUEST", "Invalid task data.", requestId);

        const update: Record<string, unknown> = { ...parsed.data };
        if (parsed.data.scheduledDate)
          update.due_at = new Date(parsed.data.scheduledDate).toISOString();

        const { data, error } = await auth.supabase
          .from("learning_plan_tasks")
          .update(update)
          .eq("id", params.taskId)
          .eq("plan_id", params.id)
          .eq("user_id", auth.userId)
          .select("*")
          .single();

        if (error) return apiErrorResponse(500, "DB_ERROR", error.message, requestId);
        if (!data) return apiErrorResponse(404, "NOT_FOUND", "Task not found.", requestId);
        return apiOkResponse(data);
      },

      DELETE: async ({ params, context }) => {
        const requestId = crypto.randomUUID();
        const auth = context as { userId?: string; supabase?: SupabaseClient<any> };
        if (!auth.userId || !auth.supabase)
          return apiErrorResponse(401, "AI_AUTH_ERROR", "Sign in required.", requestId);

        const { error } = await auth.supabase
          .from("learning_plan_tasks")
          .delete()
          .eq("id", params.taskId)
          .eq("plan_id", params.id)
          .eq("user_id", auth.userId);

        if (error) return apiErrorResponse(500, "DB_ERROR", error.message, requestId);
        return apiNoContentResponse();
      },
    },
  },
});
