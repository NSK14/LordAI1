import { createFileRoute } from "@tanstack/react-router";
import { useCanvasArtifact } from "@/features/canvas/canvas-hooks";
import { CanvasEditor } from "@/features/canvas/canvas-editor";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/canvas/$id")({
  component: CanvasArtifactPage,
});

function CanvasArtifactPage() {
  const { id } = Route.useParams();
  const { artifact, isLoading } = useCanvasArtifact(id);

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col">
        <div className="flex items-center justify-between px-6 py-3 border-b border-border">
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    );
  }

  if (!artifact) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Artifact not found</h2>
          <p className="text-muted-foreground">The requested artifact does not exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border">
        <h1 className="text-xl font-semibold truncate">{artifact.title}</h1>
      </div>
      <div className="flex-1 p-6 overflow-auto">
        <CanvasEditor initialContent={artifact.content} artifactType={artifact.type} />
      </div>
    </div>
  );
}
