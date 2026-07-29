import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSync } from "@/lib/realtime/use-realtime-sync";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) {
      throw redirect({ to: "/auth" });
    }
    return { user: data.session.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext();

  // Single, app-wide realtime sync: binds the shared RealtimeManager to this
  // user and routes conversation/message events into React Query. Mounted once
  // here so every authenticated page (chat, sidebar, dashboard) shares the same
  // websocket. Automatically unsubscribes when the user logs out (user -> null)
  // because the route redirects to /auth.
  useRealtimeSync(user?.id);

  return <Outlet />;
}
