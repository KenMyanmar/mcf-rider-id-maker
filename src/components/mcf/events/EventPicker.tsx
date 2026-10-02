import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { listMyEvents, type EventWithCounts } from "@/lib/events.functions";
import { STATUS_ORDER, statusLabel, statusBadgeClass } from "./status";
import { CalendarDays } from "lucide-react";

export function EventPicker() {
  const fetchEvents = useServerFn(listMyEvents);
  const [events, setEvents] = useState<EventWithCounts[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents()
      .then((r) => setEvents(r as EventWithCounts[]))
      .catch((e) => setError((e as Error).message));
  }, [fetchEvents]);

  if (error) {
    return <p className="text-sm text-rose-600">{error}</p>;
  }
  if (!events) {
    return <p className="text-sm text-neutral-500">Loading events…</p>;
  }
  if (events.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        No events available for your account.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {events.map((e) => (
        <Link
          key={e.id}
          to="/events/$slug"
          params={{ slug: e.slug }}
          className="block rounded-xl border border-neutral-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="text-base font-semibold text-neutral-900">
            {e.name_mm ?? e.name_en ?? e.slug}
          </div>
          {e.name_mm && e.name_en ? (
            <div className="text-xs text-neutral-500">{e.name_en}</div>
          ) : null}
          <div className="mt-1 flex items-center gap-1.5 text-xs text-neutral-500">
            <CalendarDays className="h-3.5 w-3.5" />
            {e.date ? new Date(e.date).toLocaleDateString() : "—"}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {STATUS_ORDER.filter((s) => (e.counts[s] ?? 0) > 0).map((s) => (
              <span
                key={s}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusBadgeClass(s)}`}
              >
                {statusLabel(s).mm} · {e.counts[s]}
              </span>
            ))}
            <span className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-700">
              Total · {e.total}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
