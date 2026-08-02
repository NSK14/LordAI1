import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/lord/AppShell";

export const Route = createFileRoute("/_authenticated/study")({
  component: Study,
});

function Study() {
  return (
    <AppShell>
      <main className="mx-auto max-w-6xl p-6">
        <p className="text-muted-foreground">Study is being rebuilt.</p>
      </main>
    </AppShell>
  );
}
