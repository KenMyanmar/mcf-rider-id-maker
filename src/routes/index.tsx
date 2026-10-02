import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getAccessInfo } from "@/lib/access";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const access = await getAccessInfo(data.user.id);
    throw redirect({ to: access.kind === "organizer" ? "/events" : "/work" });
  },
  component: () => null,
});
