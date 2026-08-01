import { createFileRoute } from "@tanstack/react-router";
import { StudyShell } from "@/components/learning/StudyShell";

export const Route = createFileRoute("/_authenticated/study")({
  validateSearch: (search: Record<string, unknown>) => ({
    view:
      typeof search.view === "string" &&
      ["learn", "practice", "plan", "feed", "boards", "progress"].includes(search.view)
        ? search.view
        : "learn",
  }),
  head: () => ({ meta: [{ title: "LORD — Adaptive Tutor" }] }),
  component: () => <StudyShell />,
});
