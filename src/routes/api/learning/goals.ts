/* eslint-disable @typescript-eslint/no-explicit-any -- server context receives the migration-defined database client. */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireSupabaseRequestAuth } from "@/integrations/supabase/auth-middleware";
import { apiErrorResponse } from "@/lib/api-error";

const GoalsRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("set_daily"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    targetMinutes: z.number().int().min(5).max(480).default(30),
    targetConcepts: z.number().int().min(1).max(20).default(1),
  }),
  z.object({
    action: z.literal("set_weekly"),
    weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    targetMinutes: z.number().int().min(30).max(1680).default(180),
    targetConcepts: z.number().int().min(1).max(50).default(5),
    targetExams: z.number().int().min(0).max(10).default(0),
  }),
  z.object({
    action: z.literal("get_daily"),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  }),
  z.object({
    action: z.literal("get_weekly"),
    weekStart: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  }),
  z.object({
    action: z.literal("update_progress"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    minutesStudied: z.number().int().min(0).default(0),
    conceptsCompleted: z.number().int().min(0).default(0),
  }),
  z.object({
    action: z.literal("list_daily"),
    days: z.number().int().min(1).max(365).default(30),
  }),
  z.object({
    action: z.literal("list_weekly"),
    weeks: z.number().int().min(1).max(52).default(12),
  }),
]);

export const Route = createFileRoute("/api/learning/goals")({
  server: {
    middleware: [requireSupabaseRequestAuth],
    handlers: {
      POST: async ({ request, context }) => {
        const requestId = crypto.randomUUID();
        const parsed = GoalsRequestSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success)
          return apiErrorResponse(400, "INVALID_REQUEST", "Invalid goals request.", requestId);

        const auth = context as unknown as {
          userId?: string;
          supabase?: { from: (table: string) => any; raw: (sql: string) => any };
        };
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
          if (parsed.data.action === "set_daily") {
            const { data, error } = await db
              .from("learning_daily_goals")
              .upsert(
                {
                  user_id: userId,
                  date: parsed.data.date,
                  target_minutes: parsed.data.targetMinutes,
                  target_concepts: parsed.data.targetConcepts,
                },
                { onConflict: "user_id,date" },
              )
              .select()
              .single();

            if (error) throw error;
            return Response.json({ goal: data });
          }

          if (parsed.data.action === "set_weekly") {
            const { data, error } = await db
              .from("learning_weekly_goals")
              .upsert(
                {
                  user_id: userId,
                  week_start: parsed.data.weekStart,
                  target_minutes: parsed.data.targetMinutes,
                  target_concepts: parsed.data.targetConcepts,
                  target_exams: parsed.data.targetExams,
                },
                { onConflict: "user_id,week_start" },
              )
              .select()
              .single();

            if (error) throw error;
            return Response.json({ goal: data });
          }

          if (parsed.data.action === "get_daily") {
            const date = parsed.data.date || new Date().toISOString().slice(0, 10);
            const { data, error } = await db
              .from("learning_daily_goals")
              .select("*")
              .eq("user_id", userId)
              .eq("date", date)
              .maybeSingle();

            if (error) throw error;
            return Response.json({ goal: data });
          }

          if (parsed.data.action === "get_weekly") {
            const weekStart =
              parsed.data.weekStart || getWeekStart(new Date()).toISOString().slice(0, 10);
            const { data, error } = await db
              .from("learning_weekly_goals")
              .select("*")
              .eq("user_id", userId)
              .eq("week_start", weekStart)
              .maybeSingle();

            if (error) throw error;
            return Response.json({ goal: data });
          }

          if (parsed.data.action === "update_progress") {
            const { data, error } = await db
              .from("learning_daily_goals")
              .update({
                actual_minutes: db.raw(`actual_minutes + ${parsed.data.minutesStudied}`),
                completed_concepts: db.raw(`completed_concepts + ${parsed.data.conceptsCompleted}`),
                is_completed: db.raw(
                  `actual_minutes + ${parsed.data.minutesStudied} >= target_minutes`,
                ),
              })
              .eq("user_id", userId)
              .eq("date", parsed.data.date)
              .select()
              .single();

            if (error) throw error;

            // Also update weekly goal
            const weekStart = getWeekStart(new Date(parsed.data.date)).toISOString().slice(0, 10);
            await db
              .from("learning_weekly_goals")
              .update({
                actual_minutes: db.raw(`actual_minutes + ${parsed.data.minutesStudied}`),
                completed_concepts: db.raw(`completed_concepts + ${parsed.data.conceptsCompleted}`),
              })
              .eq("user_id", userId)
              .eq("week_start", weekStart);

            return Response.json({ goal: data });
          }

          if (parsed.data.action === "list_daily") {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - parsed.data.days);
            const { data, error } = await db
              .from("learning_daily_goals")
              .select("*")
              .eq("user_id", userId)
              .gte("date", startDate.toISOString().slice(0, 10))
              .order("date", { ascending: false });

            if (error) throw error;
            return Response.json({ goals: data ?? [] });
          }

          if (parsed.data.action === "list_weekly") {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - parsed.data.weeks * 7);
            const { data, error } = await db
              .from("learning_weekly_goals")
              .select("*")
              .eq("user_id", userId)
              .gte("week_start", startDate.toISOString().slice(0, 10))
              .order("week_start", { ascending: false });

            if (error) throw error;
            return Response.json({ goals: data ?? [] });
          }

          return apiErrorResponse(400, "INVALID_ACTION", "Unknown action.", requestId);
        } catch (err) {
          console.error("Goals error:", err);
          return apiErrorResponse(500, "INTERNAL_ERROR", "Goals service unavailable.", requestId);
        }
      },
    },
  },
});

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
