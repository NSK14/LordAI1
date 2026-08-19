import { createFileRoute } from "@tanstack/react-router";
import { requireSupabaseRequestAuth } from "@/integrations/supabase/auth-middleware";
import {
  createArtifact,
  fetchArtifact,
  fetchProjectArtifacts,
  updateArtifact,
  deleteArtifact,
} from "@/features/canvas/canvas-hooks";
import type { CanvasArtifact, ArtifactType } from "@/lib/phase2/types";

export const Route = createFileRoute("/api/canvas/")({
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
          const projectId = url.searchParams.get("projectId") ?? undefined;

          const artifacts = await fetchProjectArtifacts(projectId ?? null, userId);
          return Response.json({ data: artifacts });
        } catch (error) {
          return Response.json(
            { error: { code: "internal", message: (error as Error).message } },
            { status: 500 },
          );
        }
      },
      POST: async ({ context, request }) => {
        try {
          const authContext = context as { userId?: string } | undefined;
          const userId = authContext?.userId;
          if (!userId) {
            return Response.json(
              { error: { code: "auth", message: "Unauthorized" } },
              { status: 401 },
            );
          }

          const body = await request.json();
          const { title, type, content, projectId, language, tags } = body as {
            title: string;
            type: ArtifactType;
            content: string;
            projectId?: string;
            language?: string;
            tags?: string[];
          };

          if (!title || !type) {
            return Response.json(
              { error: { code: "validation", message: "Title and type are required" } },
              { status: 400 },
            );
          }

          const artifact = await createArtifact({
            userId,
            projectId,
            title,
            type,
            content: content ?? "",
            language,
            tags,
          });

          return Response.json({ data: artifact }, { status: 201 });
        } catch (error) {
          return Response.json(
            { error: { code: "internal", message: (error as Error).message } },
            { status: 500 },
          );
        }
      },
      PATCH: async ({ context, request }) => {
        try {
          const authContext = context as { userId?: string } | undefined;
          const userId = authContext?.userId;
          if (!userId) {
            return Response.json(
              { error: { code: "auth", message: "Unauthorized" } },
              { status: 401 },
            );
          }

          const body = await request.json();
          const { id, ...updates } = body as {
            id: string;
            title?: string;
            content?: string;
            type?: ArtifactType;
            language?: string;
            tags?: string[];
            isArchived?: boolean;
            isShared?: boolean;
          };

          if (!id) {
            return Response.json(
              { error: { code: "validation", message: "ID is required" } },
              { status: 400 },
            );
          }

          const artifact = await updateArtifact(id, userId, updates);
          return Response.json({ data: artifact });
        } catch (error) {
          return Response.json(
            { error: { code: "internal", message: (error as Error).message } },
            { status: 500 },
          );
        }
      },
      DELETE: async ({ context, request }) => {
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
          const id = url.searchParams.get("id");
          if (!id) {
            return Response.json(
              { error: { code: "validation", message: "ID is required" } },
              { status: 400 },
            );
          }

          await deleteArtifact(id, userId);
          return Response.json({ data: null }, { status: 204 });
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
