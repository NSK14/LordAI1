import { createFileRoute } from "@tanstack/react-router";
import { CanvasEditor } from "@/features/canvas/canvas-editor";

export const Route = createFileRoute("/_authenticated/canvas/")({
  component: CanvasPage,
});

function CanvasPage() {
  return (
    <div className="flex h-screen flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border">
        <h1 className="text-xl font-semibold">AI Canvas</h1>
      </div>
      <div className="flex-1 p-6 overflow-auto">
        <CanvasEditor />
      </div>
    </div>
  );
}
