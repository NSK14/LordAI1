import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/study")({
  component: Study,
});

function Study() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050816] text-white">
      <h1 className="text-4xl font-bold">
        New Study Platform Coming Soon
      </h1>
    </div>
  );
}