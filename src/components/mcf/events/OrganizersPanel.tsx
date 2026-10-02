import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listEventOrganizers,
  addEventOrganizer,
  toggleOrganizerActive,
} from "@/lib/events.functions";
import type { EventOrganizerRow } from "@/lib/db-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";

export function OrganizersPanel({ eventId }: { eventId: string }) {
  const fetchList = useServerFn(listEventOrganizers);
  const addOrg = useServerFn(addEventOrganizer);
  const toggle = useServerFn(toggleOrganizerActive);

  const [rows, setRows] = useState<EventOrganizerRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetchList({ data: { event_id: eventId } })
      .then((r) => setRows(r as EventOrganizerRow[]))
      .catch((e) => setError((e as Error).message));
  }, [fetchList, eventId]);

  useEffect(load, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await addOrg({ data: { event_id: eventId, display_name: name.trim(), email: email.trim() } });
      toast.success(`Organizer invited — ${email.trim()}`);
      setName("");
      setEmail("");
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleToggle(row: EventOrganizerRow) {
    try {
      await toggle({ data: { id: row.id, active: !row.active } });
      toast.success(row.active ? "Organizer deactivated" : "Organizer activated");
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  if (error) return <p className="text-sm text-rose-600">{error}</p>;
  if (!rows) return <p className="text-sm text-neutral-500">Loading organizers…</p>;

  return (
    <div className="space-y-6 max-w-xl">
      <form onSubmit={handleAdd} className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
          <UserPlus className="h-4 w-4" />
          Add organizer
        </div>
        <div>
          <Label htmlFor="org-name">Name</Label>
          <Input id="org-name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="org-email">Email</Label>
          <Input
            id="org-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? "Inviting…" : "Invite organizer"}
        </Button>
      </form>

      <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Active</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-neutral-400">
                  No organizers yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-neutral-100">
                  <td className="px-3 py-2 font-medium">{r.display_name ?? "—"}</td>
                  <td className="px-3 py-2">{r.email ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                        r.active
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                          : "bg-neutral-100 text-neutral-500 border-neutral-200"
                      }`}
                    >
                      {r.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <Button size="sm" variant="outline" onClick={() => void handleToggle(r)}>
                      {r.active ? "Deactivate" : "Activate"}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
