import { createFileRoute } from "@tanstack/react-router";
import { requireSupabaseRequestAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/api/command-palette/search")({
  server: {
    middleware: [requireSupabaseRequestAuth],
    handlers: {
      GET: async ({ context, request }) => {
        try {
          const authContext = context as
            { userId?: string; supabase?: SupabaseClient<Database> } | undefined;
          const userId = authContext?.userId;
          const supabase = authContext?.supabase;
          if (!userId || !supabase) {
            return Response.json(
              { error: { code: "auth", message: "Unauthorized" } },
              { status: 401 },
            );
          }

          const url = new URL(request.url);
          const q = url.searchParams.get("q")?.toLowerCase().trim();
          const limit = parseInt(url.searchParams.get("limit") ?? "10", 10);

          if (!q) {
            return Response.json({ data: { results: [], total: 0 } });
          }

          const results: Array<{
            id: string;
            type: string;
            title: string;
            description?: string;
            path?: string;
            score: number;
          }> = [];

          const [conversations, notes, tasks, artifacts, knowledge] = await Promise.all([
            supabase
              .from("conversations")
              .select("id, title, updated_at")
              .eq("user_id", userId)
              .ilike("title", `%${q}%`)
              .limit(5),
            supabase
              .from("project_notes")
              .select("id, title, content")
              .eq("user_id", userId)
              .eq("is_archived", false)
              .ilike("title", `%${q}%`)
              .limit(5),
            supabase
              .from("project_tasks")
              .select("id, title, description")
              .eq("user_id", userId)
              .ilike("title", `%${q}%`)
              .limit(5),
            supabase
              .from("canvas_artifacts")
              .select("id, title, type")
              .eq("user_id", userId)
              .eq("is_archived", false)
              .ilike("title", `%${q}%`)
              .limit(5),
            supabase
              .from("knowledge_sources")
              .select("id, name, processing_status")
              .eq("user_id", userId)
              .ilike("name", `%${q}%`)
              .limit(5),
          ]);

          for (const c of conversations.data ?? []) {
            results.push({
              id: c.id,
              type: "conversation",
              title: c.title ?? "Untitled",
              path: `/chat/${c.id}`,
              score: 0.9,
            });
          }

          for (const n of notes.data ?? []) {
            results.push({
              id: n.id,
              type: "note",
              title: n.title,
              description: (n.content as string)?.slice(0, 100),
              path: `/projects/notes/${n.id}`,
              score: 0.8,
            });
          }

          for (const t of tasks.data ?? []) {
            results.push({
              id: t.id,
              type: "task",
              title: t.title,
              description: (t.description as string)?.slice(0, 100),
              path: `/projects/tasks/${t.id}`,
              score: 0.7,
            });
          }

          for (const a of artifacts.data ?? []) {
            results.push({
              id: a.id,
              type: "artifact",
              title: a.title,
              description: a.type,
              path: `/canvas/${a.id}`,
              score: 0.8,
            });
          }

          for (const k of knowledge.data ?? []) {
            results.push({
              id: k.id,
              type: "knowledge",
              title: k.name,
              description: k.processing_status,
              path: `/knowledge/${k.id}`,
              score: 0.7,
            });
          }

          results.sort((a, b) => b.score - a.score);

          return Response.json({
            data: {
              results: results.slice(0, limit),
              total: results.length,
            },
          });
        } catch (error) {
          return Response.json(
            { error: { code: "internal", message: (error as Error).message } },
            { status: 500 },
          );
        }
      },
    },
  },
});
