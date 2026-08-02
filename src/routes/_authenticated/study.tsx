import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import { StudyRouter } from "@/components/study/StudyRouter";

// eslint-disable-next-line react-refresh/only-export-components
export const studySearchSchema = z.object({
  view: z
    .enum([
      "landing",
      "learn",
      "practice",
      "plan",
      "feed",
      "boards",
      "progress",
      "notes",
      "flashcards",
      "test",
      "tutor",
      "revision",
      "help",
      "mnemonics",
    ])
    .optional()
    .default("landing"),
});

export const Route = createFileRoute("/_authenticated/study")({
  validateSearch: studySearchSchema,
  component: Study,
});

function Study() {
  return <StudyRouter />;
}
