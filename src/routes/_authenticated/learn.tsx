import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/learn")({
  beforeLoad: () => {
    throw redirect({ to: "/study", search: { view: "learn" } });
  },
});
