/* eslint-disable @typescript-eslint/no-explicit-any -- server context receives the migration-defined database client. */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireSupabaseRequestAuth } from "@/integrations/supabase/auth-middleware";
import { apiErrorResponse } from "@/lib/api-error";

const OCRRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("process"),
    sourceId: z.string().uuid(),
    mimeType: z.string(),
    fileBase64: z.string().min(1),
  }),
  z.object({
    action: z.literal("status"),
    jobId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("list"),
    status: z.enum(["pending", "processing", "completed", "failed"]).optional(),
    limit: z.number().int().min(1).max(50).default(20),
  }),
]);

export const Route = createFileRoute("/api/learning/ocr")({
  server: {
    middleware: [requireSupabaseRequestAuth],
    handlers: {
      POST: async ({ request, context }) => {
        const requestId = crypto.randomUUID();
        const parsed = OCRRequestSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success)
          return apiErrorResponse(400, "INVALID_REQUEST", "Invalid OCR request.", requestId);

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
          if (parsed.data.action === "process") {
            // Create OCR job
            const { data: job, error } = await db
              .from("learning_ocr_jobs")
              .insert({
                user_id: userId,
                source_id: parsed.data.sourceId,
                mime_type: parsed.data.mimeType,
                storage_path: `ocr/${userId}/${crypto.randomUUID()}`,
                status: "processing",
              })
              .select()
              .single();

            if (error) throw error;

            // In production, process OCR asynchronously with Tesseract.js, Google Vision, or AWS Textract
            // For now, simulate processing
            setTimeout(async () => {
              try {
                // Simulated extracted text
                const extractedText =
                  "[OCR processing would extract text from the uploaded image/PDF here]";

                await db
                  .from("learning_ocr_jobs")
                  .update({
                    status: "completed",
                    extracted_text: extractedText,
                    structured_data: { pages: 1, language: "en", confidence: 0.92 },
                    completed_at: new Date().toISOString(),
                    processing_time_ms: 2500,
                  })
                  .eq("id", job.id);

                // Update source with extracted text if source exists
                if (parsed.data.sourceId) {
                  await db
                    .from("learning_sources")
                    .update({ extracted_text: extractedText })
                    .eq("id", parsed.data.sourceId)
                    .eq("user_id", userId);
                }
              } catch (e) {
                await db
                  .from("learning_ocr_jobs")
                  .update({
                    status: "failed",
                    error_message: "OCR processing failed",
                    completed_at: new Date().toISOString(),
                  })
                  .eq("id", job.id);
              }
            }, 100);

            return Response.json({ job });
          }

          if (parsed.data.action === "status") {
            const { data, error } = await db
              .from("learning_ocr_jobs")
              .select("*")
              .eq("id", parsed.data.jobId)
              .eq("user_id", userId)
              .maybeSingle();

            if (error) throw error;
            if (!data) return apiErrorResponse(404, "NOT_FOUND", "OCR job not found.", requestId);
            return Response.json({ job: data });
          }

          if (parsed.data.action === "list") {
            let query = db
              .from("learning_ocr_jobs")
              .select("*")
              .eq("user_id", userId)
              .order("created_at", { ascending: false })
              .limit(parsed.data.limit);

            if (parsed.data.status) {
              query = query.eq("status", parsed.data.status);
            }

            const { data, error } = await query;
            if (error) throw error;
            return Response.json({ jobs: data ?? [] });
          }

          return apiErrorResponse(400, "INVALID_ACTION", "Unknown action.", requestId);
        } catch (err) {
          console.error("OCR error:", err);
          return apiErrorResponse(500, "INTERNAL_ERROR", "OCR service unavailable.", requestId);
        }
      },
    },
  },
});
