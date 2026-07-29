/* eslint-disable @typescript-eslint/no-explicit-any -- server context receives the migration-defined database client. */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireSupabaseRequestAuth } from "@/integrations/supabase/auth-middleware";
import { apiErrorResponse } from "@/lib/api-error";

const IngestUrlSchema = z.object({
  url: z.string().url(),
  conceptId: z.string().min(1).optional(),
});

export const Route = createFileRoute("/api/learning/sources/ingest")({
  server: {
    middleware: [requireSupabaseRequestAuth],
    handlers: {
      POST: async ({ request, context }) => {
        const requestId = crypto.randomUUID();
        const body = await request.json().catch(() => null);
        const parsed = IngestUrlSchema.safeParse(body);
        if (!parsed.success)
          return apiErrorResponse(400, "INVALID_REQUEST", "A valid URL is required.", requestId);

        const auth = context as { userId?: string; supabase?: { from: (table: string) => any } };
        if (!auth.userId || !auth.supabase)
          return apiErrorResponse(401, "AI_AUTH_ERROR", "Sign in to save sources.", requestId);

        try {
          const response = await fetch(parsed.data.url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; LORD Study Bot/1.0)",
              Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
            signal: AbortSignal.timeout(15_000),
          });
          const html = await response.text();
          const text = html
            .replace(/<script[\s\S]*?<\/script>/gi, " ")
            .replace(/<style[\s\S]*?<\/style>/gi, " ")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 80_000);

          const { data: source, error } = await auth.supabase
            .from("learning_sources")
            .insert({
              user_id: auth.userId,
              name: new URL(parsed.data.url).hostname,
              mime_type: "text/html",
              source_kind: "upload",
              extracted_text: text,
              provenance_url: parsed.data.url,
            })
            .select("id")
            .single();

          if (error) throw error;

          if (source?.id) {
            const chunks = text.match(/[\s\S]{1,1800}/g) ?? [];
            if (chunks.length) {
              await auth.supabase.from("learning_source_chunks").insert(
                chunks.map((content: string, chunkIndex: number) => ({
                  user_id: auth.userId,
                  source_id: source.id,
                  chunk_index: chunkIndex,
                  content,
                })),
              );
            }
          }

          return Response.json({ ok: true, sourceId: source?.id, characterCount: text.length });
        } catch {
          return apiErrorResponse(502, "AI_UPSTREAM_ERROR", "Could not fetch that URL.", requestId);
        }
      },
    },
  },
});
