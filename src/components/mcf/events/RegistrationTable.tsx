import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import {
  listEventRegistrations,
  getEventRegistration,
  getProofSignedUrl,
  getNrcPhotoSignedUrl,
  updateRegistrationStatus,
} from "@/lib/events.functions";
import type { EventRow, EventRegistrationRow, EventDivision } from "@/lib/db-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STATUS_ORDER, statusLabel, statusBadgeClass } from "./status";
import { EditRegistrationDialog } from "./EditRegistrationDialog";
import { Download, Search, Eye, X } from "lucide-react";

function findDivision(event: EventRow | null, id: string | null): EventDivision | undefined {
  if (!id) return undefined;
  return (event?.divisions ?? []).find((x: EventDivision) => x.id === id);
}

function divisionLabel(event: EventRow | null, id: string | null): string {
  if (!id) return "—";
  const d = findDivision(event, id);
  return d ? (d.mm ?? d.en ?? d.id) : id;
}

function divisionEn(event: EventRow | null, id: string | null): string {
  if (!id) return "";
  const d = findDivision(event, id);
  return d ? (d.en ?? d.id) : id;
}

function divisionMm(event: EventRow | null, id: string | null): string {
  if (!id) return "";
  const d = findDivision(event, id);
  return d ? (d.mm ?? d.en ?? d.id) : id;
}

function bloodLabel(v: string | null | undefined): string {
  if (!v) return "—";
  return v === "unknown" ? "Don't know" : v;
}

export function RegistrationTable({ slug, isAdmin }: { slug: string; isAdmin: boolean }) {
  const fetchList = useServerFn(listEventRegistrations);
  const fetchOne = useServerFn(getEventRegistration);
  const fetchProof = useServerFn(getProofSignedUrl);
  const fetchNrc = useServerFn(getNrcPhotoSignedUrl);
  const saveStatus = useServerFn(updateRegistrationStatus);

  const [event, setEvent] = useState<EventRow | null>(null);
  const [rows, setRows] = useState<EventRegistrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [division, setDivision] = useState("");

  const [detail, setDetail] = useState<EventRegistrationRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [newStatus, setNewStatus] = useState("registered");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [sizeCounts, setSizeCounts] = useState<Record<string, number>>({});

  const load = useCallback(() => {
    setLoading(true);
    fetchList({
      data: {
        slug,
        query: query || undefined,
        status: status || undefined,
        division: division || undefined,
      },
    })
      .then((r) => {
        const res = r as {
          event: EventRow;
          registrations: EventRegistrationRow[];
          sizeCounts: Record<string, number>;
        };
        setEvent(res.event);
        setRows(res.registrations);
        setSizeCounts(res.sizeCounts ?? {});
        setError(null);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [fetchList, slug, query, status, division]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const divisions = useMemo(() => event?.divisions ?? [], [event]);

  async function openDetail(id: string) {
    setDetailLoading(true);
    try {
      const row = (await fetchOne({ data: { id } })) as EventRegistrationRow;
      setDetail(row);
      setNewStatus(row.status);
      setNote(row.status_note ?? "");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDetailLoading(false);
    }
  }

  async function viewNrc(side: "front" | "back") {
    if (!detail) return;
    try {
      const { url } = (await fetchNrc({ data: { id: detail.id, side } })) as { url: string };
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function viewProof() {
    if (!detail) return;
    try {
      const { url } = (await fetchProof({ data: { id: detail.id } })) as { url: string };
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function applyStatus() {
    if (!detail) return;
    if (newStatus === "cancelled" && detail.status !== "cancelled") {
      if (!window.confirm("Cancel this registration? This cannot be undone easily.")) return;
    }
    setSaving(true);
    try {
      const updated = (await saveStatus({
        data: { id: detail.id, status: newStatus as "registered" | "paid" | "confirmed" | "cancelled", note },
      })) as EventRegistrationRow;
      toast.success(`${statusLabel(updated.status).mm} — ${updated.full_name ?? ""}`);
      setDetail({ ...detail, ...updated });
      setRows((rs) => rs.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function exportExcel() {
    const data = rows.map((r) => ({
      Reference: r.reference_no ?? "",
      Name: r.full_name ?? "",
      Phone: r.phone ?? "",
      Division: divisionEn(event, r.division),
      "Division (MM)": divisionMm(event, r.division),
      "Team/Club": r.team_club ?? "",
      "Blood type": r.blood_type ? bloodLabel(r.blood_type) : "",
      "Shirt size": r.shirt_size ?? "",
      "Emergency contact name": r.emergency_contact_name ?? "",
      "Emergency contact phone": r.emergency_contact_phone ?? "",
      Status: statusLabel(r.status).en,
      "Status (MM)": statusLabel(r.status).mm,
      Proof: r.payment_proof_path ? "yes" : "no",
      "NRC front": r.nrc_photo_path ? "yes" : "no",
      "NRC back": r.nrc_photo_back_path ? "yes" : "no",
      "Created at": r.created_at ?? "",
      "Last status change": r.status_updated_at ?? "",
      Note: r.status_note ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Registrations");
    XLSX.writeFile(wb, `${slug}-registrations.xlsx`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone, reference…"
            className="pl-8 w-64"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-md border border-neutral-200 bg-white px-2 text-sm"
        >
          <option value="">All statuses</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s).mm} ({statusLabel(s).en})
            </option>
          ))}
        </select>
        <select
          value={division}
          onChange={(e) => setDivision(e.target.value)}
          className="h-9 rounded-md border border-neutral-200 bg-white px-2 text-sm"
        >
          <option value="">All divisions</option>
          {divisions.map((d: EventDivision) => (
            <option key={d.id} value={d.id}>
              {d.mm ?? d.en ?? d.id}
            </option>
          ))}
        </select>
        <Button variant="outline" size="sm" onClick={exportExcel} className="gap-1.5 ml-auto">
          <Download className="h-3.5 w-3.5" />
          Export Excel
        </Button>
      </div>

      {(event?.shirt_sizes ?? []).length > 0 ? (
        <p className="text-xs text-neutral-600">
          <span className="font-medium text-neutral-800">Shirt sizes (not cancelled): </span>
          {(event?.shirt_sizes ?? [])
            .map((s) => `${s} ${sizeCounts[s] ?? 0}`)
            .join(" · ")}
        </p>
      ) : null}

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}


      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
              <th className="px-3 py-2">Reference</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Division</th>
              <th className="px-3 py-2">Team/Club</th>
              <th className="px-3 py-2">Blood</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Proof</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} className="px-3 py-6 text-center text-neutral-400">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-3 py-6 text-center text-neutral-400">
                  No registrations found.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                  <td className="px-3 py-2 font-mono text-xs">{r.reference_no ?? "—"}</td>
                  <td className="px-3 py-2 font-medium">{r.full_name ?? "—"}</td>
                  <td className="px-3 py-2">{r.phone ?? "—"}</td>
                  <td className="px-3 py-2" title={divisionEn(event, r.division)}>
                    {divisionLabel(event, r.division)}
                  </td>
                  <td className="px-3 py-2">{r.team_club ?? "—"}</td>
                  <td className="px-3 py-2">{bloodLabel(r.blood_type)}</td>
                  <td className="px-3 py-2">{r.shirt_size ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusBadgeClass(r.status)}`}
                      title={statusLabel(r.status).en}
                    >
                      {statusLabel(r.status).mm}
                    </span>
                  </td>
                  <td className="px-3 py-2">{r.payment_proof_path ? "✓" : "—"}</td>
                  <td className="px-3 py-2 text-xs text-neutral-500">
                    {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <Button size="sm" variant="ghost" onClick={() => void openDetail(r.id)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {(detail || detailLoading) && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setDetail(null)}>
          <div
            className="h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Registration detail</h2>
              <Button size="sm" variant="ghost" onClick={() => setDetail(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {detailLoading || !detail ? (
              <p className="mt-4 text-sm text-neutral-500">Loading…</p>
            ) : (
              <div className="mt-4 space-y-4">
                <dl className="space-y-1.5 text-sm">
                  {(
                    [
                      ["Reference", detail.reference_no],
                      ["Name", detail.full_name],
                      ["Phone", detail.phone],
                      ["Division", divisionLabel(event, detail.division)],
                      ["Team/Club", detail.team_club],
                      ["Blood type", bloodLabel(detail.blood_type)],
                      ["Shirt size", detail.shirt_size ?? null],
                      ["Emergency contact", detail.emergency_contact_name ?? null],
                      ["Emergency phone", detail.emergency_contact_phone ? (
                        <a className="underline underline-offset-2" href={`tel:${detail.emergency_contact_phone}`}>
                          {detail.emergency_contact_phone}
                        </a>
                      ) : null],
                      ["NRC number", detail.nrc ?? null],
                      ["Father's name", detail.father_name ?? null],
                      ["Date of birth", detail.dob ?? null],
                      ["Address", detail.address ?? null],
                      ["Note", detail.note ?? null],
                      ["Waiver accepted", detail.waiver_accepted_at ? new Date(detail.waiver_accepted_at).toLocaleString() : null],
                      ["Created", detail.created_at ? new Date(detail.created_at).toLocaleString() : null],
                      ["Last status change", detail.status_updated_at ? new Date(detail.status_updated_at).toLocaleString() : null],
                      ["Last edited", detail.info_updated_at ? new Date(detail.info_updated_at).toLocaleString() : null],
                    ] as Array<[string, React.ReactNode]>
                  ).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3">
                      <dt className="text-neutral-500 shrink-0">{k}</dt>
                      <dd className="font-medium text-right break-words">{v ?? "—"}</dd>
                    </div>
                  ))}
                </dl>


                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!detail.payment_proof_path}
                    onClick={() => void viewProof()}
                  >
                    View proof
                  </Button>
                  {detail.nrc_photo_path ? (
                    <Button variant="outline" size="sm" onClick={() => void viewNrc("front")}>
                      View NRC front
                    </Button>
                  ) : null}
                  {detail.nrc_photo_back_path ? (
                    <Button variant="outline" size="sm" onClick={() => void viewNrc("back")}>
                      View NRC back
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={detail.status === "cancelled"}
                    title={detail.status === "cancelled" ? "Cancelled registrations cannot be edited" : undefined}
                    onClick={() => setEditOpen(true)}
                  >
                    Edit rider
                  </Button>
                </div>
                <EditRegistrationDialog
                  row={detail}
                  divisions={divisions}
                  open={editOpen}
                  onOpenChange={setEditOpen}
                  onSaved={(u) => {
                    setDetail({ ...detail, ...u });
                    setRows((rs) => rs.map((r) => (r.id === u.id ? { ...r, ...u } : r)));
                  }}
                />

                <div className="rounded-lg border border-neutral-200 p-3 space-y-2">
                  <div className="text-xs font-semibold text-neutral-700">Update status</div>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="h-9 w-full rounded-md border border-neutral-200 bg-white px-2 text-sm"
                  >
                    {STATUS_ORDER.map((s) => (
                      <option key={s} value={s}>
                        {statusLabel(s).mm} ({statusLabel(s).en})
                      </option>
                    ))}
                  </select>
                  <Input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Note (optional)"
                  />
                  <Button size="sm" disabled={saving} onClick={() => void applyStatus()}>
                    {saving ? "Saving…" : "Save status"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
