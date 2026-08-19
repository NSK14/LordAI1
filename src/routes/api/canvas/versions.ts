import { createFileRoute } from "@tanstack/react-router";
import { requireSupabaseRequestAuth } from "@/integrations/supabase/auth-middleware";
import { fetchVersions } from "@/features/canvas/canvas-hooks";

export const Route = createFileRoute("/api/canvas/versions")({
  server: {
    middleware: [requireSupabaseRequestAuth],
    handlers: {
      GET: async ({ context, request }) => {
        try {
          const authContext = context as { userId?: string } | undefined;
          const userId = authContext?.userId;
          if (!userId) {
            return Response.json(
              { error: { code: "auth", message: "Unauthorized" } },
              { status: 401 },
            );
          }

          const url = new URL(request.url);
          const artifactId = url.searchParams.get("artifactId");
          if (!artifactId) {
            return Response.json(
              { error: { code: "validation", message: "artifactId is required" } },
              { status: 400 },
            );
          }

          const versions = await fetchVersions(artifactId);
          return Response.json({ data: versions });
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
