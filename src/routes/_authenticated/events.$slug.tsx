import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAccessInfo } from "@/lib/access";
import { RegistrationTable } from "@/components/mcf/events/RegistrationTable";

export const Route = createFileRoute("/_authenticated/events/$slug")({
  head: () => ({
    meta: [
      { title: "Event Registrations — MCF" },
      { name: "description", content: "Registration list for an MCF event." },
    ],
  }),
  component: EventRegistrationsPage,
});

function EventRegistrationsPage() {
  const { slug } = Route.useParams();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const access = await getAccessInfo(data.user.id);
      setIsAdmin(access.isAdmin);
    });
  }, []);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-neutral-900">Registrations</h1>
        {isAdmin ? (
          <Link
            to="/events/$slug/organizers"
            params={{ slug }}
            className="text-sm font-medium text-neutral-600 underline underline-offset-4 hover:text-neutral-900"
          >
            Organizers
          </Link>
        ) : null}
      </div>
      <RegistrationTable slug={slug} isAdmin={isAdmin} />
    </main>
  );
}
