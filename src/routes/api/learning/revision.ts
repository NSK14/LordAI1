/* eslint-disable @typescript-eslint/no-explicit-any -- server context receives the migration-defined database client. */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireSupabaseRequestAuth } from "@/integrations/supabase/auth-middleware";
import { apiErrorResponse } from "@/lib/api-error";

const RevisionRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("schedule"),
    conceptIds: z.array(z.string().min(1)).min(1).max(50),
  }),
  z.object({
    action: z.literal("due"),
    limit: z.number().int().min(1).max(100).default(20),
  }),
  z.object({
    action: z.literal("complete"),
    conceptId: z.string().min(1),
    quality: z.number().int().min(0).max(5),
  }),
  z.object({
    action: z.literal("get"),
    conceptId: z.string().min(1),
  }),
  z.object({
    action: z.literal("list"),
    limit: z.number().int().min(1).max(100).default(50),
  }),
]);

export const Route = createFileRoute("/api/learning/revision")({
  server: {
    middleware: [requireSupabaseRequestAuth],
    handlers: {
      POST: async ({ request, context }) => {
        const requestId = crypto.randomUUID();
        const parsed = RevisionRequestSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success)
          return apiErrorResponse(400, "INVALID_REQUEST", "Invalid revision request.", requestId);

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
          if (parsed.data.action === "schedule") {
            const schedules = [];

            for (const conceptId of parsed.data.conceptIds) {
              const { data: mastery } = await db
                .from("learning_mastery")
                .select("*")
                .eq("user_id", userId)
                .eq("concept_id", conceptId)
                .maybeSingle();

              const score = mastery?.score ?? 0.35;
              const confidence = mastery?.confidence ?? 0.2;

              // Ebbinghaus forgetting curve with SM-2 adaptation
              const baseIntervals = [1, 3, 7, 14, 30, 60, 120];
              const masteryFactor = Math.max(0.5, Math.min(2, 1 / Math.max(0.1, score)));
              const confidenceFactor = Math.max(0.7, Math.min(1.5, 1 / Math.max(0.1, confidence)));

              const nextInterval = Math.round(baseIntervals[0] * masteryFactor * confidenceFactor);
              const nextReview = new Date(Date.now() + nextInterval * 86400000).toISOString();
              const retentionEstimate = Math.max(0.1, Math.min(0.95, score * confidence * 1.2));

              const { data, error } = await db
                .from("learning_revision_schedule")
                .upsert(
                  {
                    user_id: userId,
                    concept_id: conceptId,
                    mastery_score: score,
                    confidence,
                    retention_estimate: retentionEstimate,
                    next_review_at: nextReview,
                    review_interval_days: nextInterval,
                    ease_factor: 2.5,
                    consecutive_successes: 0,
                    consecutive_failures: 0,
                  },
                  { onConflict: "user_id,concept_id" },
                )
                .select()
                .single();

              if (error) throw error;
              schedules.push(data);
            }

            return Response.json({ schedules });
          }

          if (parsed.data.action === "due") {
            const { data, error } = await db
              .from("learning_revision_schedule")
              .select("*, learning_concepts(title, subject, standard_code)")
              .eq("user_id", userId)
              .lte("next_review_at", new Date().toISOString())
              .order("next_review_at")
              .limit(parsed.data.limit);

            if (error) throw error;
            return Response.json({ due: data ?? [] });
          }

          if (parsed.data.action === "complete") {
            const { data: schedule } = await db
              .from("learning_revision_schedule")
              .select("*")
              .eq("user_id", userId)
              .eq("concept_id", parsed.data.conceptId)
              .maybeSingle();

            if (!schedule)
              return apiErrorResponse(404, "NOT_FOUND", "Revision schedule not found.", requestId);

            const quality = parsed.data.quality;
            let { ease_factor, review_interval_days, consecutive_successes, consecutive_failures } =
              schedule;

            if (quality >= 3) {
              consecutive_successes += 1;
              consecutive_failures = 0;
              if (consecutive_successes === 1) review_interval_days = 1;
              else if (consecutive_successes === 2) review_interval_days = 6;
              else review_interval_days = Math.round(review_interval_days * ease_factor);
            } else {
              consecutive_successes = 0;
              consecutive_failures += 1;
              review_interval_days = 1;
            }

            ease_factor = Math.max(
              1.3,
              ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
            );

            const nextReview = new Date(Date.now() + review_interval_days * 86400000).toISOString();

            // Update mastery
            const { data: mastery } = await db
              .from("learning_mastery")
              .select("*")
              .eq("user_id", userId)
              .eq("concept_id", parsed.data.conceptId)
              .maybeSingle();

            const correct = quality >= 3;
            const { nextMastery } = await import("@/lib/learning/mastery");
            const update = nextMastery(
              mastery as { score: number; confidence: number; evidence_count: number } | null,
              correct,
            );

            await Promise.all([
              db
                .from("learning_revision_schedule")
                .update({
                  mastery_score: update.score,
                  confidence: update.confidence,
                  retention_estimate: Math.max(
                    0.1,
                    Math.min(0.95, update.score * update.confidence * 1.2),
                  ),
                  next_review_at: nextReview,
                  review_interval_days: review_interval_days,
                  ease_factor,
                  consecutive_successes,
                  consecutive_failures,
                  last_reviewed_at: new Date().toISOString(),
                })
                .eq("user_id", userId)
                .eq("concept_id", parsed.data.conceptId),
              db
                .from("learning_mastery")
                .upsert(
                  { user_id: userId, concept_id: parsed.data.conceptId, ...update },
                  { onConflict: "user_id,concept_id" },
                ),
            ]);

            return Response.json({ success: true, nextReviewAt: nextReview });
          }

          if (parsed.data.action === "get") {
            const { data, error } = await db
              .from("learning_revision_schedule")
              .select("*")
              .eq("user_id", userId)
              .eq("concept_id", parsed.data.conceptId)
              .maybeSingle();

            if (error) throw error;
            if (!data)
              return apiErrorResponse(404, "NOT_FOUND", "No revision schedule.", requestId);
            return Response.json({ schedule: data });
          }

          if (parsed.data.action === "list") {
            const { data, error } = await db
              .from("learning_revision_schedule")
              .select("*, learning_concepts(title, subject, standard_code)")
              .eq("user_id", userId)
              .order("next_review_at")
              .limit(parsed.data.limit);

            if (error) throw error;
            return Response.json({ schedules: data ?? [] });
          }

          return apiErrorResponse(400, "INVALID_ACTION", "Unknown action.", requestId);
        } catch (err) {
          console.error("Revision error:", err);
          return apiErrorResponse(
            500,
            "INTERNAL_ERROR",
            "Revision service unavailable.",
            requestId,
          );
        }
      },
    },
  },
});
