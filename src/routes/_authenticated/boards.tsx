import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/boards")({
  beforeLoad: () => {
    throw redirect({ to: "/study", search: { view: "dashboard" } });
  },
});
