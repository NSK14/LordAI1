import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/practice")({
  beforeLoad: () => {
    throw redirect({ to: "/study", search: { view: "practice" } });
  },
});
