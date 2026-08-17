import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { apiOkResponse, apiErrorResponse, getSafeErrorMessage } from "@/lib/api-error";
import { requireSupabaseRequestAuth } from "@/integrations/supabase/auth-middleware";
import { globalSearch } from "@/lib/brain/search";

const SearchSchema = z.object({
  q: z.string().min(1).max(500),
  projectId: z.string().uuid().optional().nullable(),
  entityTypes: z
    .array(
      z.enum([
        "conversation",
        "message",
        "memory",
        "knowledge_chunk",
        "note",
        "task",
        "artifact",
        "document",
      ]),
    )
    .optional(),
  limit: z.coerce.number().int().max(50).optional(),
});

export const Route = createFileRoute("/api/search")({
  server: {
    middleware: [requireSupabaseRequestAuth],
    handlers: {
      GET: async ({ context, request }) => {
        try {
          const { userId } = context as { userId: string };
          const url = new URL(request.url);
          const parsed = SearchSchema.safeParse({
            q: url.searchParams.get("q") ?? "",
            projectId: url.searchParams.get("projectId") ?? undefined,
            entityTypes: url.searchParams.getAll("entityTypes"),
            limit: url.searchParams.get("limit") ?? undefined,
          });
          if (!parsed.success) {
            return apiErrorResponse(
              400,
              "INVALID_REQUEST",
              parsed.error.message,
              crypto.randomUUID(),
            );
          }
          const results = await globalSearch({
            userId,
            query: parsed.data.q,
            projectId: parsed.data.projectId ?? null,
            entityTypes: parsed.data.entityTypes,
            limit: parsed.data.limit ?? 20,
          });
          return apiOkResponse({ results, query: parsed.data.q });
        } catch (err) {
          return apiErrorResponse(500, "DB_ERROR", getSafeErrorMessage(err), crypto.randomUUID());
        }
      },
    },
  },
});
