import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getAccessInfo } from "@/lib/access";
import { TopBar } from "@/components/mcf/TopBar";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth" });
    }
    const access = await getAccessInfo(data.user.id);
    const path = location.pathname;
    const staffOnly = path.startsWith("/work") || path.startsWith("/print");
    if (staffOnly && access.kind !== "staff") {
      throw redirect({ to: access.kind === "organizer" ? "/events" : "/auth" });
    }
    return { user: data.user, access };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { user, access } = Route.useRouteContext();
  return (
    <div className="min-h-screen bg-neutral-50">
      <TopBar email={user?.email ?? null} access={access} />
      <Outlet />
    </div>
  );
}
