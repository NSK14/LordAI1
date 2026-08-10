/* eslint-disable @typescript-eslint/no-explicit-any -- server context receives the migration-defined database client. */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireSupabaseRequestAuth } from "@/integrations/supabase/auth-middleware";
import { apiErrorResponse } from "@/lib/api-error";

const AnalyticsRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("record"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    studyTimeSeconds: z.number().int().min(0).default(0),
    conceptsStudied: z.number().int().min(0).default(0),
    questionsAnswered: z.number().int().min(0).default(0),
    correctAnswers: z.number().int().min(0).default(0),
    tutorMessages: z.number().int().min(0).default(0),
    flashcardsReviewed: z.number().int().min(0).default(0),
    notesCreated: z.number().int().min(0).default(0),
    examsCompleted: z.number().int().min(0).default(0),
    voiceMinutes: z.number().int().min(0).default(0),
    whiteboardSessions: z.number().int().min(0).default(0),
    xpEarned: z.number().int().min(0).default(0),
  }),
  z.object({
    action: z.literal("get_range"),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  z.object({
    action: z.literal("get_summary"),
    days: z.number().int().min(1).max(365).default(30),
  }),
  z.object({
    action: z.literal("get_streak"),
  }),
]);

export const Route = createFileRoute("/api/learning/analytics")({
  server: {
    middleware: [requireSupabaseRequestAuth],
    handlers: {
      POST: async ({ request, context }) => {
        const requestId = crypto.randomUUID();
        const parsed = AnalyticsRequestSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success)
          return apiErrorResponse(400, "INVALID_REQUEST", "Invalid analytics request.", requestId);

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
          if (parsed.data.action === "record") {
            const { data, error } = await db
              .from("learning_analytics")
              .upsert(
                {
                  user_id: userId,
                  date: parsed.data.date,
                  study_time_seconds: parsed.data.studyTimeSeconds,
                  concepts_studied: parsed.data.conceptsStudied,
                  questions_answered: parsed.data.questionsAnswered,
                  correct_answers: parsed.data.correctAnswers,
                  tutor_messages: parsed.data.tutorMessages,
                  flashcards_reviewed: parsed.data.flashcardsReviewed,
                  notes_created: parsed.data.notesCreated,
                  exams_completed: parsed.data.examsCompleted,
                  voice_minutes: parsed.data.voiceMinutes,
                  whiteboard_sessions: parsed.data.whiteboardSessions,
                  xp_earned: parsed.data.xpEarned,
                },
                { onConflict: "user_id,date" },
              )
              .select()
              .single();

            if (error) throw error;
            return Response.json({ analytics: data });
          }

          if (parsed.data.action === "get_range") {
            const { data, error } = await db
              .from("learning_analytics")
              .select("*")
              .eq("user_id", userId)
              .gte("date", parsed.data.startDate)
              .lte("date", parsed.data.endDate)
              .order("date", { ascending: true });

            if (error) throw error;
            return Response.json({ analytics: data ?? [] });
          }

          if (parsed.data.action === "get_summary") {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - parsed.data.days);

            const { data, error } = await db
              .from("learning_analytics")
              .select("*")
              .eq("user_id", userId)
              .gte("date", startDate.toISOString().slice(0, 10))
              .order("date", { ascending: true });

            if (error) throw error;

            const rows = (data ?? []) as Array<{
              date: string;
              study_time_seconds: number;
              concepts_studied: number;
              questions_answered: number;
              correct_answers: number;
              tutor_messages: number;
              flashcards_reviewed: number;
              notes_created: number;
              exams_completed: number;
              voice_minutes: number;
              whiteboard_sessions: number;
              xp_earned: number;
            }>;

            const summary = {
              totalStudyTime: rows.reduce((sum: number, d) => sum + (d.study_time_seconds || 0), 0),
              totalConcepts: rows.reduce((sum: number, d) => sum + (d.concepts_studied || 0), 0),
              totalQuestions: rows.reduce((sum: number, d) => sum + (d.questions_answered || 0), 0),
              totalCorrect: rows.reduce((sum: number, d) => sum + (d.correct_answers || 0), 0),
              totalTutorMessages: rows.reduce((sum: number, d) => sum + (d.tutor_messages || 0), 0),
              totalFlashcards: rows.reduce((sum: number, d) => sum + (d.flashcards_reviewed || 0), 0),
              totalNotes: rows.reduce((sum: number, d) => sum + (d.notes_created || 0), 0),
              totalExams: rows.reduce((sum: number, d) => sum + (d.exams_completed || 0), 0),
              totalVoiceMinutes: rows.reduce((sum: number, d) => sum + (d.voice_minutes || 0), 0),
              totalWhiteboards:
                rows.reduce((sum: number, d) => sum + (d.whiteboard_sessions || 0), 0),
              totalXP: rows.reduce((sum: number, d) => sum + (d.xp_earned || 0), 0),
              daysActive: rows.filter((d) => (d.study_time_seconds || 0) > 0).length,
              dailyData: rows,
            };

            return Response.json({ summary });
          }

          if (parsed.data.action === "get_streak") {
            const { data, error } = await db
              .from("learning_analytics")
              .select("date")
              .eq("user_id", userId)
              .gt("study_time_seconds", 0)
              .order("date", { ascending: false });

            if (error) throw error;

            let streak = 0;
            const today = new Date().toISOString().slice(0, 10);
            let checkDate = today;

            const activeDays = new Set(data?.map((d: { date: string }) => d.date) || []);

            while (activeDays.has(checkDate)) {
              streak++;
              const d = new Date(checkDate);
              d.setDate(d.getDate() - 1);
              checkDate = d.toISOString().slice(0, 10);
            }

            return Response.json({ streak });
          }

          return apiErrorResponse(400, "INVALID_ACTION", "Unknown action.", requestId);
        } catch (err) {
          console.error("Analytics error:", err);
          return apiErrorResponse(
            500,
            "INTERNAL_ERROR",
            "Analytics service unavailable.",
            requestId,
          );
        }
      },
    },
  },
});
