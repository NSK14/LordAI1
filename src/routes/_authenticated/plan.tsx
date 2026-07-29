import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/plan")({
  beforeLoad: () => {
    throw redirect({ to: "/study", search: { view: "plan" } });
  },
});
