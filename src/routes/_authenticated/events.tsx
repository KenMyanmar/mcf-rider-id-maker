import { createFileRoute } from "@tanstack/react-router";
import { EventPicker } from "@/components/mcf/events/EventPicker";

export const Route = createFileRoute("/_authenticated/events")({
  head: () => ({
    meta: [
      { title: "Event Registrations — MCF" },
      { name: "description", content: "Manage event registrations for MCF events." },
    ],
  }),
  component: EventsPage,
});

function EventsPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-lg font-semibold text-neutral-900 mb-4">Event Registrations</h1>
      <EventPicker />
    </main>
  );
}
