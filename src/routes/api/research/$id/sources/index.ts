/* eslint-disable @typescript-eslint/no-explicit-any -- server context receives the migration-defined database client. */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireSupabaseRequestAuth } from "@/integrations/supabase/auth-middleware";
import { apiErrorResponse, apiOkResponse } from "@/lib/api-error";
import type { SupabaseClient } from "@supabase/supabase-js";

const SourceSchema = z.object({
  url: z.string().url(),
  title: z.string().optional(),
  domain: z.string().optional(),
  favicon_url: z.string().url().optional(),
  snippet: z.string().optional(),
  content_text: z.string().optional(),
  published_at: z.string().datetime().optional(),
});

export const Route = createFileRoute("/api/research/$id/sources/")({
  server: {
    middleware: [requireSupabaseRequestAuth],
    handlers: {
      GET: async ({ params, context }) => {
        const auth = context as { userId?: string; supabase?: SupabaseClient<any> };
        if (!auth.userId || !auth.supabase)
          return apiErrorResponse(401, "AI_AUTH_ERROR", "Sign in required.", crypto.randomUUID());

        const { data: session } = await auth.supabase
          .from("research_sessions")
          .select("id")
          .eq("id", params.id)
          .eq("user_id", auth.userId)
          .maybeSingle();

        if (!session)
          return apiErrorResponse(
            404,
            "NOT_FOUND",
            "Research session not found.",
            crypto.randomUUID(),
          );

        const { data, error } = await auth.supabase
          .from("research_sources")
          .select("*")
          .eq("research_session_id", params.id)
          .order("created_at", { ascending: false });

        if (error) return apiErrorResponse(500, "DB_ERROR", error.message, crypto.randomUUID());
        return apiOkResponse(data ?? []);
      },

      POST: async ({ request, params, context }) => {
        const auth = context as { userId?: string; supabase?: SupabaseClient<any> };
        if (!auth.userId || !auth.supabase)
          return apiErrorResponse(401, "AI_AUTH_ERROR", "Sign in required.", crypto.randomUUID());

        const { data: session } = await auth.supabase
          .from("research_sessions")
          .select("id")
          .eq("id", params.id)
          .eq("user_id", auth.userId)
          .maybeSingle();

        if (!session)
          return apiErrorResponse(
            404,
            "NOT_FOUND",
            "Research session not found.",
            crypto.randomUUID(),
          );

        const body = await request.json().catch(() => null);
        const parsed = SourceSchema.safeParse(body);
        if (!parsed.success)
          return apiErrorResponse(
            400,
            "INVALID_REQUEST",
            "Invalid source data.",
            crypto.randomUUID(),
          );

        const { data, error } = await auth.supabase
          .from("research_sources")
          .insert({
            research_session_id: params.id,
            user_id: auth.userId,
            ...parsed.data,
          })
          .select("*")
          .single();

        if (error) return apiErrorResponse(500, "DB_ERROR", error.message, crypto.randomUUID());
        return apiOkResponse(data, 201);
      },
    },
  },
});
