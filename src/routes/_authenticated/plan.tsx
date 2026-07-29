import { createFileRoute } from "@tanstack/react-router";
import { LearningPage } from "@/components/learning/LearningPage";
export const Route = createFileRoute("/_authenticated/plan")({
  component: () => <LearningPage view="plan" />,
});
