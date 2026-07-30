/* eslint-disable @typescript-eslint/no-explicit-any -- server context receives the migration-defined database client. */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireSupabaseRequestAuth } from "@/integrations/supabase/auth-middleware";
import { apiErrorResponse } from "@/lib/api-error";

const IngestUrlSchema = z.object({
  url: z.string().url(),
  conceptId: z.string().min(1).optional(),
});

function isSSRFBlocked(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    if (!["http:", "https:"].includes(url.protocol)) return true;

    const hostname = url.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.endsWith(".local") ||
      hostname === "169.254.169.254" ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      (hostname.startsWith("172.") && /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) ||
      hostname.startsWith("0.") ||
      hostname.startsWith("255.") ||
      hostname.endsWith(".onion")
    ) {
      return true;
    }
  } catch {
    return true;
  }
  return false;
}

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

        if (isSSRFBlocked(parsed.data.url))
          return apiErrorResponse(400, "INVALID_REQUEST", "URL target is not allowed.", requestId);

        const auth = context as { userId?: string; supabase?: { from: (table: string) => any } };
        if (!auth.userId || !auth.supabase)
          return apiErrorResponse(401, "AI_AUTH_ERROR", "Sign in to save sources.", requestId);

        try {
          const response = await fetch(parsed.data.url, {
            redirect: "error",
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; LORD Study Bot/1.0)",
              Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
            signal: AbortSignal.timeout(15_000),
          });
          if (!response.ok)
            return apiErrorResponse(
              502,
              "AI_UPSTREAM_ERROR",
              "Could not fetch that URL.",
              requestId,
            );
          const contentType = response.headers.get("content-type") ?? "";
          if (!/text\/html|text\/plain|application\/xml/i.test(contentType))
            return apiErrorResponse(
              415,
              "INVALID_REQUEST",
              "Only text and HTML links can be imported.",
              requestId,
            );
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
