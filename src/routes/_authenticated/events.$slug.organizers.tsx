import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAccessInfo } from "@/lib/access";
import { OrganizersPanel } from "@/components/mcf/events/OrganizersPanel";
import { listMyEvents, type EventWithCounts } from "@/lib/events.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/_authenticated/events/$slug/organizers")({
  head: () => ({
    meta: [
      { title: "Event Organizers — MCF" },
      { name: "description", content: "Manage organizers for an MCF event." },
    ],
  }),
  component: OrganizersPage,
});

function OrganizersPage() {
  const { slug } = Route.useParams();
  const fetchEvents = useServerFn(listMyEvents);
  const [state, setState] = useState<
    { kind: "loading" } | { kind: "denied" } | { kind: "ok"; eventId: string }
  >({ kind: "loading" });

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return setState({ kind: "denied" });
      const access = await getAccessInfo(data.user.id);
      if (!access.isAdmin) return setState({ kind: "denied" });
      const events = (await fetchEvents()) as EventWithCounts[];
      const ev = events.find((e) => e.slug === slug);
      if (!ev) return setState({ kind: "denied" });
      setState({ kind: "ok", eventId: ev.id });
    })();
  }, [fetchEvents, slug]);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-4 flex items-center gap-3">
        <Link
          to="/events/$slug"
          params={{ slug }}
          className="text-sm text-neutral-500 underline underline-offset-4 hover:text-neutral-900"
        >
          ← Registrations
        </Link>
        <h1 className="text-lg font-semibold text-neutral-900">Organizers</h1>
      </div>
      {state.kind === "loading" ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : state.kind === "denied" ? (
        <p className="text-sm text-rose-600">Admin staff only.</p>
      ) : (
        <OrganizersPanel eventId={state.eventId} />
      )}
    </main>
  );
}
