import { useCallback, useEffect, useMemo, useState } from "react";
import { classBibUsage, classCapacity, formatBibRange } from "@/lib/bib-blocks";
import { useServerFn } from "@tanstack/react-start";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import {
  listEventRegistrations,
  getEventRegistration,
  getProofSignedUrl,
  getNrcPhotoSignedUrl,
  updateRegistrationStatus,
  updateRegistrationBib,
  uploadRegistrationDocument,
} from "@/lib/events.functions";
import type { EventRow, EventRegistrationRow, EventDivision } from "@/lib/db-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STATUS_ORDER, statusLabel, statusBadgeClass } from "./status";
import { EditRegistrationDialog } from "./EditRegistrationDialog";
import { AddRiderDrawer } from "./AddRiderDrawer";
import { Download, Search, Eye, X, AlertTriangle, UserPlus } from "lucide-react";
import { checkAgeClass, formatAge } from "@/lib/age-class";

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
  const saveBib = useServerFn(updateRegistrationBib);
  const uploadDoc = useServerFn(uploadRegistrationDocument);
  const [uploading, setUploading] = useState<string | null>(null);
  const [capacity, setCapacity] = useState<Capacity>({ paidConfirmed: 0, registered: 0, bibsByDivision: {} });
  const [ageMismatchIds, setAgeMismatchIds] = useState<string[]>([]);
  const [pendingBib, setPendingBib] = useState<Array<{ id: string; full_name: string | null }>>([]);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkReport, setBulkReport] = useState<{ ok: number; failed: Array<{ name: string; reason: string }> } | null>(null);
  const [sortBib, setSortBib] = useState<"" | "asc" | "desc">("");
  const [manualBib, setManualBib] = useState("");

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
  const [staffAddedIds, setStaffAddedIds] = useState<string[]>([]);
  const [addedByNames, setAddedByNames] = useState<Record<string, string>>({});
  const [paidConfirmedBySize, setPaidConfirmedBySize] = useState<Record<string, number>>({});
  const [addOpen, setAddOpen] = useState(false);

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
          paidConfirmedBySize?: Record<string, number>;
          capacity: Capacity;
          pendingBib: Array<{ id: string; full_name: string | null }>;
          ageMismatchIds: string[];
          staffAddedIds?: string[];
          addedByNames?: Record<string, string>;
        };
        setAgeMismatchIds(res.ageMismatchIds ?? []);
        setCapacity(res.capacity);
        setPendingBib(res.pendingBib ?? []);
        setEvent(res.event);
        setRows(res.registrations);
        setSizeCounts(res.sizeCounts ?? {});
        setStaffAddedIds(res.staffAddedIds ?? []);
        setAddedByNames(res.addedByNames ?? {});
        setPaidConfirmedBySize(res.paidConfirmedBySize ?? {});
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
      setManualBib(row.bib_no != null ? String(row.bib_no) : "");
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

  function mergeRow(updated: EventRegistrationRow) {
    setDetail((d) => (d && d.id === updated.id ? { ...d, ...updated } : d));
    setRows((rs) => rs.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
  }

  async function issueBib() {
    if (!detail) return;
    setSaving(true);
    try {
      const updated = (await saveStatus({ data: { id: detail.id, status: "confirmed", note } })) as EventRegistrationRow;
      mergeRow(updated);
      setNewStatus(updated.status);
      setManualBib(updated.bib_no != null ? String(updated.bib_no) : "");
      toast.success(`Bib ${updated.bib_no ?? "?"} issued — ${updated.full_name ?? ""}`);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function applyManualBib(clear = false) {
    if (!detail) return;
    const v = clear ? null : manualBib.trim() === "" ? null : Number(manualBib);
    if (v !== null && (!Number.isInteger(v) || v <= 0)) {
      toast.error("Bib must be a whole number");
      return;
    }
    setSaving(true);
    try {
      const updated = (await saveBib({ data: { id: detail.id, bib_no: v } })) as EventRegistrationRow;
      mergeRow(updated);
      setManualBib(updated.bib_no != null ? String(updated.bib_no) : "");
      toast.success(updated.bib_no != null ? `Bib set to ${updated.bib_no}` : "Bib cleared");
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(kind: DocKind, file: File) {
    if (!detail) return;
    const spec = DOC_SPECS[kind];
    if (!spec.types.includes(file.type)) {
      toast.error(spec.typeError);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is larger than 5 MB");
      return;
    }
    setUploading(kind);
    try {
      const fd = new FormData();
      fd.append("id", detail.id);
      fd.append("kind", kind);
      fd.append("file", file);
      const updated = (await uploadDoc({ data: fd })) as EventRegistrationRow;
      mergeRow(updated);
      toast.success(`${spec.label} uploaded — ${updated.full_name ?? ""}`);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(null);
    }
  }

  async function issueAll() {
    const list = pendingBib;
    if (list.length === 0) return;
    if (!window.confirm(`Issue bibs to all ${list.length} Paid riders in this race (oldest registration first)?`)) return;
    setBulkRunning(true);
    setBulkReport(null);
    let ok = 0;
    const failed: Array<{ name: string; reason: string }> = [];
    for (const r of list) {
      try {
        await saveStatus({ data: { id: r.id, status: "confirmed", note: null } });
        ok++;
      } catch (e) {
        failed.push({ name: r.full_name ?? r.id, reason: (e as Error).message });
      }
    }
    setBulkReport({ ok, failed });
    setBulkRunning(false);
    toast.message(`Issued ${ok}, failed ${failed.length}`);
    load();
  }

  const shownRows = useMemo(() => {
    if (!sortBib) return rows;
    const dir = sortBib === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (a.bib_no == null && b.bib_no == null) return 0;
      if (a.bib_no == null) return 1;
      if (b.bib_no == null) return -1;
      return (a.bib_no - b.bib_no) * dir;
    });
  }, [rows, sortBib]);

  async function exportExcel() {
    let allRows: EventRegistrationRow[];
    try {
      const res = (await fetchList({
        data: {
          slug,
          query: query || undefined,
          status: status || undefined,
          division: division || undefined,
          exportAll: true,
        },
      })) as { registrations: EventRegistrationRow[] };
      allRows = res.registrations;
    } catch (e) {
      toast.error((e as Error).message);
      return;
    }
    const anyBib = allRows.some((r) => r.bib_no != null);
    const src = anyBib
      ? [...allRows].sort((a, b) => (a.bib_no ?? Infinity) - (b.bib_no ?? Infinity))
      : allRows;
    const data = src.map((r) => ({
      Bib: r.bib_no ?? "",
      Reference: r.reference_no ?? "",
      Name: r.full_name ?? "",
      Phone: r.phone ?? "",
      Address: r.address ?? "",
      Division: divisionEn(event, r.division),
      "Division (MM)": divisionMm(event, r.division),

      "Blood type": r.blood_type ? bloodLabel(r.blood_type) : "",
      "Shirt size": r.shirt_size ?? "",
      "Emergency contact name": r.emergency_contact_name ?? "",
      "Emergency contact phone": r.emergency_contact_phone ?? "",
      Status: statusLabel(r.status).en,
      "Status (MM)": statusLabel(r.status).mm,
      Proof: r.payment_proof_path ? "yes" : "no",
      "Proof uploaded by": r.payment_proof_path ? (r.payment_proof_uploaded_by ? "staff" : "rider") : "",
      "NRC front": r.nrc_photo_path ? "yes" : "no",
      "NRC back": r.nrc_photo_back_path ? "yes" : "no",
      "Created at": r.created_at ?? "",
      "Last status change": r.status_updated_at ?? "",
      Note: r.status_note ?? "",
      DOB: r.dob ?? "",
      "Age on race day": formatAge(r.dob ?? null, event?.date ?? null) ?? "",
      "Age check": ageCheck(event, r).mismatch
        ? `mismatch — suggested ${divisionEn(event, ageCheck(event, r).suggestedId) || "none"}`
        : r.dob ? "OK" : "",
      "Team/Club": r.team_club ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    // Wide Address column so long text stays readable.
    ws["!cols"] = Object.keys(data[0] ?? { Address: "" }).map((k) =>
      k === "Address" ? { wch: 45 } : k === "Name" ? { wch: 25 } : { wch: 16 },
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Registrations");
    XLSX.writeFile(wb, `${slug}-registrations.xlsx`);
    toast.success(`Exported ${src.length} riders`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone, reference, bib…"
            className="pl-8 w-64"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-md border border-neutral-200 bg-white px-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="paid_no_bib">Paid, no bib</option>
          <option value="proof_not_paid">Has proof, not yet Paid</option>
          <option value="no_proof">No proof yet</option>
          <option value="age_mismatch">Age mismatch</option>
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

      <CapacityPanel event={event} capacity={capacity} />

      {ageMismatchIds.length > 0 || status === "age_mismatch" ? (
        <button
          type="button"
          onClick={() => setStatus((v) => (v === "age_mismatch" ? "" : "age_mismatch"))}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
            status === "age_mismatch"
              ? "border-amber-500 bg-amber-500 text-white"
              : "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Age mismatch / အသက်နှင့်အတန်း မကိုက်: {ageMismatchIds.length}
          {status === "age_mismatch" ? " ✕" : ""}
        </button>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={bulkRunning || pendingBib.length === 0} onClick={() => void issueAll()}>
          {bulkRunning ? "Issuing…" : `Issue bibs to all Paid riders (${pendingBib.length})`}
        </Button>
        {bulkReport ? (
          <div className="text-xs text-neutral-700">
            Issued {bulkReport.ok}, failed {bulkReport.failed.length}
            {bulkReport.failed.length > 0 ? (
              <ul className="mt-1 list-disc pl-4 text-rose-700">
                {bulkReport.failed.map((f, i) => (
                  <li key={i}>{f.name}: {f.reason}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}


      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
              <th className="px-3 py-2">
                <button
                  type="button"
                  className="font-medium hover:text-neutral-900"
                  onClick={() => setSortBib((v) => (v === "asc" ? "desc" : v === "desc" ? "" : "asc"))}
                >
                  Bib{sortBib === "asc" ? " ▲" : sortBib === "desc" ? " ▼" : ""}
                </button>
              </th>
              <th className="px-3 py-2">Reference</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Division</th>
              <th className="px-3 py-2">DOB</th>
              <th className="px-3 py-2">Blood</th>
              <th className="px-3 py-2">Size</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Proof</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Team/Club</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={13} className="px-3 py-6 text-center text-neutral-400">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-3 py-6 text-center text-neutral-400">
                  No registrations found.
                </td>
              </tr>
            ) : (
              shownRows.map((r) => (
                <tr key={r.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                  <td className="px-3 py-2 font-mono font-semibold">{r.bib_no ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.reference_no ?? "—"}</td>
                  <td className="px-3 py-2 font-medium">{r.full_name ?? "—"}</td>
                  <td className="px-3 py-2">{r.phone ?? "—"}</td>
                  {(() => {
                    const chk = ageCheck(event, r);
                    const warn = chk.mismatch;
                    const tip = warn ? mismatchText(event, r).en : divisionEn(event, r.division);
                    const cls = warn ? "bg-amber-50 text-amber-900 cursor-pointer" : "";
                    const open = warn ? () => void openDetail(r.id) : undefined;
                    return (
                      <>
                        <td className={`px-3 py-2 ${cls}`} title={tip} onClick={open}>
                          <span className="inline-flex items-center gap-1">
                            {warn ? <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" /> : null}
                            {divisionLabel(event, r.division)}
                          </span>
                        </td>
                        <td className={`px-3 py-2 whitespace-nowrap ${cls}`} title={warn ? tip : undefined} onClick={open}>
                          <span className="inline-flex items-center gap-1">
                            {warn ? <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" /> : null}
                            {r.dob ? `${formatDob(r.dob)}${formatAge(r.dob, event?.date ?? null) ? ` · ${formatAge(r.dob, event?.date ?? null)}` : ""}` : "—"}
                          </span>
                        </td>
                      </>
                    );
                  })()}
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
                  <td className="px-3 py-2">{r.team_club ?? "—"}</td>
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
                {ageCheck(event, detail).mismatch ? (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-medium">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                      {mismatchText(event, detail).en}
                    </div>
                    <div>{mismatchText(event, detail).mm}</div>
                    <div className="text-xs text-amber-800">Warning only — check the NRC photo, then change the class in Edit rider if needed.</div>
                  </div>
                ) : null}
                <dl className="space-y-1.5 text-sm">
                  {(
                    [
                      ["Bib", detail.bib_no != null ? String(detail.bib_no) : null],
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
                      ["Date of birth", detail.dob ? `${formatDob(detail.dob)}${formatAge(detail.dob, event?.date ?? null) ? ` · ${formatAge(detail.dob, event?.date ?? null)} on race day` : ""}` : null],
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


                {detail.status === "paid" && detail.bib_no == null ? (
                  <Button className="w-full" disabled={saving} onClick={() => void issueBib()}>
                    Issue bib / နံပါတ်ထုတ်ပေးရန်
                  </Button>
                ) : null}

                {detail.status === "paid" || detail.status === "confirmed" ? (
                  <div className="rounded-lg border border-neutral-200 p-3 space-y-2">
                    <div className="text-xs font-semibold text-neutral-700">Set bib manually</div>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        step={1}
                        value={manualBib}
                        onChange={(e) => setManualBib(e.target.value)}
                        placeholder="Bib number"
                      />
                      <Button size="sm" variant="outline" disabled={saving} onClick={() => void applyManualBib()}>
                        Save bib
                      </Button>
                      {detail.bib_no != null ? (
                        <Button size="sm" variant="ghost" disabled={saving} onClick={() => void applyManualBib(true)}>
                          Clear
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

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
                <div className="rounded-lg border border-neutral-200 p-3 space-y-2">
                  <div className="text-xs font-semibold text-neutral-700">
                    Upload for rider / ပြိုင်ပွဲဝင်အတွက် တင်ပေးရန်
                  </div>
                  {(["payment_proof", "nrc_front", "nrc_back"] as DocKind[]).map((k) => (
                    <UploadRow
                      key={k}
                      kind={k}
                      row={detail}
                      busy={uploading === k}
                      disabled={detail.status === "cancelled" || uploading !== null}
                      onFile={(f) => void handleUpload(k, f)}
                    />
                  ))}
                  {detail.status === "cancelled" ? (
                    <p className="text-xs text-neutral-500">Cancelled registrations cannot receive uploads.</p>
                  ) : null}
                </div>

                <EditRegistrationDialog
                  row={detail}
                  divisions={divisions}
                  shirtSizes={event?.shirt_sizes ?? []}
                  open={editOpen}
                  onOpenChange={setEditOpen}
                  onSaved={(u) => {
                    setDetail({ ...detail, ...u });
                    setRows((rs) => rs.map((r) => (r.id === u.id ? { ...r, ...u } : r)));
                    setManualBib(u.bib_no != null ? String(u.bib_no) : "");
                    load();
                  }}
                />

                <div className="rounded-lg border border-neutral-200 p-3 space-y-2">
                  <div className="text-xs font-semibold text-neutral-700">Update status</div>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="h-9 w-full rounded-md border border-neutral-200 bg-white px-2 text-sm"
                  >
                    {STATUS_ORDER.map((s) => {
                      const blocked = s === "confirmed" && detail.status !== "paid" && detail.status !== "confirmed";
                      return (
                        <option key={s} value={s} disabled={blocked}>
                          {statusLabel(s).mm} ({statusLabel(s).en}){blocked ? " — Mark Paid first" : ""}
                        </option>
                      );
                    })}
                  </select>
                  {detail.status !== "paid" && detail.status !== "confirmed" ? (
                    <p className="text-xs text-neutral-500">Confirmed: Mark Paid first.</p>
                  ) : null}
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

type Capacity = {
  paidConfirmed: number;
  registered: number;
  bibsByDivision: Record<string, number>;
  usedBibs?: number[];
};

function CapacityPanel({ event, capacity }: { event: EventRow | null; capacity: Capacity }) {
  if (!event) return null;
  const cap = event.max_participants;
  const pct = cap ? capacity.paidConfirmed / cap : 0;
  const divs = (event.divisions ?? []).filter((d) => classCapacity(d) > 0);
  return (
    <div className="space-y-2">
      {cap && pct >= 1 ? (
        <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">
          Cap reached: public registration is now closed. Riders who registered earlier may still pay.
        </div>
      ) : cap && pct >= 0.8 ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
          Race is {Math.floor(pct * 100)}% full
        </div>
      ) : null}
      <div className="rounded-xl border border-neutral-200 bg-white p-3 text-sm space-y-2">
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          {cap ? (
            <span>
              <span className="text-neutral-500">Paid + Confirmed: </span>
              <span className="font-semibold">{capacity.paidConfirmed} / {cap}</span>
            </span>
          ) : null}
          <span>
            <span className="text-neutral-500">Registered, not yet paid: </span>
            <span className="font-semibold">{capacity.registered}</span>
          </span>
        </div>
        {divs.length > 0 ? (
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
            {divs.map((d) => {
              const { capacity: size, used, left } = classBibUsage(d, capacity.usedBibs ?? []);
              return (
                <span key={d.id} className={left <= 5 ? "text-rose-700 font-medium" : "text-neutral-700"}>
                  {d.en ?? d.mm ?? d.id} ({formatBibRange(d)}): {used} / {size}
                  {left <= 5 ? ` — only ${Math.max(left, 0)} left` : ""}
                </span>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

type DocKind = "payment_proof" | "nrc_front" | "nrc_back";
const IMG = ["image/jpeg", "image/png", "image/webp"];
const DOC_SPECS: Record<DocKind, { label: string; accept: string; types: string[]; typeError: string }> = {
  payment_proof: {
    label: "Payment proof",
    accept: "image/*,application/pdf",
    types: [...IMG, "application/pdf"],
    typeError: "Use a JPG, PNG, WebP or PDF file",
  },
  nrc_front: { label: "NRC front", accept: "image/*", types: IMG, typeError: "Use a JPG, PNG or WebP photo" },
  nrc_back: { label: "NRC back", accept: "image/*", types: IMG, typeError: "Use a JPG, PNG or WebP photo" },
};

function UploadRow({
  kind,
  row,
  busy,
  disabled,
  onFile,
}: {
  kind: DocKind;
  row: EventRegistrationRow;
  busy: boolean;
  disabled: boolean;
  onFile: (f: File) => void;
}) {
  const spec = DOC_SPECS[kind];
  const path = kind === "payment_proof" ? row.payment_proof_path : kind === "nrc_front" ? row.nrc_photo_path : row.nrc_photo_back_path;
  const at = kind === "payment_proof" ? row.payment_proof_uploaded_at : kind === "nrc_front" ? row.nrc_photo_uploaded_at : row.nrc_photo_back_uploaded_at;
  const by = kind === "payment_proof" ? row.payment_proof_uploaded_by : kind === "nrc_front" ? row.nrc_photo_uploaded_by : row.nrc_photo_back_uploaded_by;
  const who = by ? (row.uploader_names?.[by] ?? "staff") : "rider";
  const inputId = `upload-${kind}`;
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div className="min-w-0">
        <div className="font-medium">{spec.label}</div>
        <div className="text-xs text-neutral-500">
          {path ? `On file${at ? ` — ${new Date(at).toLocaleString()}` : ""}, by ${who}` : "Not uploaded"}
        </div>
      </div>
      <input
        id={inputId}
        type="file"
        accept={spec.accept}
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onFile(f);
        }}
      />
      <Button
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={() => {
          if (path && !window.confirm(`Replace the ${spec.label.toLowerCase()} already on file?`)) return;
          document.getElementById(inputId)?.click();
        }}
      >
        {busy ? "Uploading…" : path ? "Replace" : "Upload"}
      </Button>
    </div>
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function formatDob(d: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : d;
}

function ageCheck(event: EventRow | null, r: { division: string | null; dob?: string | null }) {
  return checkAgeClass(r.division, r.dob ?? null, event?.date ?? null);
}

const MM_DIGITS = "၀၁၂၃၄၅၆၇၈၉";
const toMm = (n: number | string) => String(n).replace(/\d/g, (c) => MM_DIGITS[Number(c)]);

function mismatchText(event: EventRow | null, r: { division: string | null; dob?: string | null }) {
  const c = ageCheck(event, r);
  const age = formatAge(r.dob ?? null, event?.date ?? null) ?? "—";
  const chosenEn = divisionEn(event, r.division);
  const chosenMm = divisionMm(event, r.division);
  const sugEn = c.suggestedId ? divisionEn(event, c.suggestedId) : "—";
  const sugMm = c.suggestedId ? divisionMm(event, c.suggestedId) : "—";
  return {
    en: `Age ${age} on race day. Class chosen: ${chosenEn}. Suggested: ${sugEn}.`,
    mm: `ပြိုင်ပွဲနေ့တွင် အသက် ${toMm(age)} နှစ်။ ရွေးထားသောအတန်း: ${chosenMm}။ အကြံပြု: ${sugMm}။`,
  };
}
