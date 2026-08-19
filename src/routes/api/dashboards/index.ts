import { createFileRoute } from "@tanstack/react-router";
import { requireSupabaseRequestAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/api/dashboards")({
  server: {
    middleware: [requireSupabaseRequestAuth],
    handlers: {
      GET: async ({ context }) => {
        try {
          const authContext = context as
            { supabase?: SupabaseClient<Database>; userId?: string } | undefined;
          const supabase = authContext?.supabase;
          const userId = authContext?.userId;
          if (!userId || !supabase) {
            return Response.json(
              { error: { code: "auth", message: "Unauthorized" } },
              { status: 401 },
            );
          }

          const [
            conversationsRes,
            messagesRes,
            artifactsRes,
            knowledgeRes,
            memoriesRes,
            tasksRes,
            notesRes,
            filesRes,
            activityRes,
          ] = await Promise.all([
            supabase
              .from("conversations")
              .select("id", { count: "exact", head: true })
              .eq("user_id", userId),
            supabase
              .from("messages")
              .select("id", { count: "exact", head: true })
              .eq("role", "user")
              .eq("user_id", userId),
            supabase
              .from("canvas_artifacts")
              .select("id", { count: "exact", head: true })
              .eq("user_id", userId)
              .eq("is_archived", false),
            supabase
              .from("knowledge_sources")
              .select("id", { count: "exact", head: true })
              .eq("user_id", userId),
            supabase
              .from("memories")
              .select("id", { count: "exact", head: true })
              .eq("user_id", userId)
              .eq("archived", false),
            supabase
              .from("project_tasks")
              .select("id", { count: "exact", head: true })
              .eq("user_id", userId),
            supabase
              .from("project_notes")
              .select("id", { count: "exact", head: true })
              .eq("user_id", userId)
              .eq("is_archived", false),
            supabase
              .from("files")
              .select("id", { count: "exact", head: true })
              .eq("user_id", userId)
              .eq("is_archived", false),
            supabase
              .from("project_activity")
              .select("*")
              .eq("user_id", userId)
              .order("created_at", { ascending: false })
              .limit(20),
          ]);

          const stats = {
            totalConversations: conversationsRes.count ?? 0,
            totalMessages: messagesRes.count ?? 0,
            totalArtifacts: artifactsRes.count ?? 0,
            totalKnowledgeSources: knowledgeRes.count ?? 0,
            totalMemories: memoriesRes.count ?? 0,
            totalTasks: tasksRes.count ?? 0,
            totalNotes: notesRes.count ?? 0,
            totalFiles: filesRes.count ?? 0,
            recentActivity: (activityRes.data ?? []).map((a: Record<string, unknown>) => ({
              id: a.id as string,
              action: a.action as string,
              entityType: a.entity_type as string,
              entityId: a.entity_id as string,
              createdAt: a.created_at as string,
              metadata: (a.metadata as Record<string, unknown>) ?? {},
            })),
            tokenUsageToday: 0,
            tokenUsageThisWeek: 0,
            modelUsageBreakdown: {},
          };

          return Response.json({ data: stats });
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
