import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, X } from "lucide-react";
import { addEventRegistration, findEventDuplicates } from "@/lib/events.functions";
import { BLOOD_TYPES, type EventDivision, type EventRegistrationRow, type EventRow } from "@/lib/db-types";
import { checkAgeClass, formatAge } from "@/lib/age-class";
import { classBibUsage, formatBibRange } from "@/lib/bib-blocks";
import { sizeLeft } from "@/lib/shirt-stock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Dup = {
  id: string;
  reference_no: string | null;
  full_name: string | null;
  phone: string | null;
  status: string;
};

type Form = {
  full_name: string;
  phone: string;
  nrc: string;
  father_name: string;
  dobDay: string;
  dobMonth: string;
  dobYear: string;
  address: string;
  division: string;
  team_club: string;
  shirt_size: string;
  blood_type: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  note: string;
  waiver: boolean;
};

function emptyForm(): Form {
  return {
    full_name: "",
    phone: "",
    nrc: "",
    father_name: "",
    dobDay: "",
    dobMonth: "",
    dobYear: "",
    address: "",
    division: "",
    team_club: "",
    shirt_size: "",
    blood_type: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    note: "",
    waiver: false,
  };
}

const sel = "h-9 w-full rounded-md border border-neutral-200 bg-white px-2 text-sm";

export function AddRiderDrawer({
  event,
  paidConfirmedBySize,
  usedBibs,
  open,
  onOpenChange,
  onAdded,
  onOpenExisting,
}: {
  event: EventRow;
  paidConfirmedBySize: Record<string, number>;
  usedBibs: number[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdded: (row: EventRegistrationRow) => void;
  onOpenExisting: (id: string) => void;
}) {
  const add = useServerFn(addEventRegistration);
  const findDups = useServerFn(findEventDuplicates);
  const [f, setF] = useState<Form>(emptyForm);
  const [dups, setDups] = useState<Dup[]>([]);
  const [dupConfirmed, setDupConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setF(emptyForm());
      setDups([]);
      setDupConfirmed(false);
      setBusy(false);
    }
  }, [open]);

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setF((p) => ({ ...p, [k]: v }));
    if (k === "phone" || k === "nrc") {
      setDups([]);
      setDupConfirmed(false);
    }
  }

  const dob = useMemo(() => {
    if (!f.dobDay || !f.dobMonth || !f.dobYear) return null;
    return `${f.dobYear}-${f.dobMonth.padStart(2, "0")}-${f.dobDay.padStart(2, "0")}`;
  }, [f.dobDay, f.dobMonth, f.dobYear]);

  const divisions = useMemo(() => event.divisions ?? [], [event]);
  const sizes = useMemo(() => event.shirt_sizes ?? [], [event]);
  const hasStock = !!event.shirt_stock;

  const ageChk = useMemo(
    () => checkAgeClass(f.division || null, dob, event.date),
    [f.division, dob, event.date],
  );
  const ageText = useMemo(() => formatAge(dob, event.date), [dob, event.date]);
  const suggested = useMemo(
    () => divisions.find((d) => d.id === ageChk.suggestedId),
    [divisions, ageChk.suggestedId],
  );

  const chosenDiv = useMemo(() => divisions.find((d) => d.id === f.division), [divisions, f.division]);
  const bibUsage = useMemo(
    () => (chosenDiv ? classBibUsage(chosenDiv, usedBibs) : null),
    [chosenDiv, usedBibs],
  );

  // Live duplicate check (debounced) on phone / NRC.
  useEffect(() => {
    if (!open) return;
    const phone = f.phone.trim();
    const nrc = f.nrc.trim();
    if (phone.replace(/\D/g, "").length < 8 && !nrc) return;
    const t = setTimeout(() => {
      void findDups({ data: { slug: event.slug, phone: phone || undefined, nrc: nrc || undefined } })
        .then((rows) => setDups((rows ?? []) as Dup[]))
        .catch(() => undefined);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.phone, f.nrc, open, event.slug]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (dups.length > 0 && !dupConfirmed) {
      toast.error("Possible duplicate — choose \"Open existing\" or \"Add anyway\" below.");
      return;
    }
    if (!f.waiver) {
      toast.error("Please confirm the rider has read and signed the waiver.");
      return;
    }
    setBusy(true);
    try {
      const row = (await add({
        data: {
          slug: event.slug,
          full_name: f.full_name,
          phone: f.phone,
          nrc: f.nrc || null,
          father_name: f.father_name || null,
          dob,
          address: f.address || null,
          division: f.division,
          team_club: f.team_club || null,
          note: f.note || null,
          blood_type: (f.blood_type || null) as (typeof BLOOD_TYPES)[number] | null,
          emergency_contact_name: f.emergency_contact_name || null,
          emergency_contact_phone: f.emergency_contact_phone || null,
          shirt_size: f.shirt_size || null,
          waiverAccepted: f.waiver,
        },
      })) as EventRegistrationRow;
      const ref = row.reference_no ?? "";
      toast.success(`Rider added · ${ref} / ပြိုင်ပွဲဝင် ထည့်ပြီး`, {
        action: {
          label: "Add another",
          onClick: () => onOpenChange(true),
        },
      });
      onOpenChange(false);
      onAdded(row);
    } catch (err) {
      const msg = (err as Error).message;
      toast.error(msg.startsWith("[") ? "Please check the fields / အချက်အလက်များ ပြန်စစ်ပါ" : msg);
      // Form data is kept — nothing is retyped.
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  const years: number[] = [];
  const thisYear = new Date().getFullYear();
  for (let y = thisYear - 5; y >= thisYear - 100; y--) years.push(y);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => onOpenChange(false)}>
      <div
        className="h-full w-full sm:max-w-xl overflow-y-auto bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Add rider / ပြိုင်ပွဲဝင် ထည့်ရန်</h2>
          <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={(e) => void submit(e)} className="mt-4 space-y-5">
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Rider / ပြိုင်ပွဲဝင်
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Full name * / အမည်">
                <Input
                  required
                  minLength={2}
                  maxLength={120}
                  value={f.full_name}
                  onChange={(e) => set("full_name", e.target.value)}
                  autoFocus
                />
              </Field>
              <Field label="Phone * / ဖုန်းနံပါတ်">
                <Input
                  required
                  pattern="[0-9+\- ]{5,30}"
                  inputMode="tel"
                  value={f.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  className="font-mono"
                />
              </Field>
              <Field label="NRC number / မှတ်ပုံတင်">
                <Input value={f.nrc} onChange={(e) => set("nrc", e.target.value)} className="font-mono" />
              </Field>
              <Field label="Father's name / အဖအမည်">
                <Input value={f.father_name} onChange={(e) => set("father_name", e.target.value)} />
              </Field>
              <div className="sm:col-span-2">
                <Label className="text-xs text-neutral-600">Date of birth / မွေးနေ့</Label>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  <select aria-label="Day" value={f.dobDay} onChange={(e) => set("dobDay", e.target.value)} className={sel}>
                    <option value="">Day</option>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={String(d)}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <select aria-label="Month" value={f.dobMonth} onChange={(e) => set("dobMonth", e.target.value)} className={sel}>
                    <option value="">Month</option>
                    {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map(
                      (m, i) => (
                        <option key={m} value={String(i + 1)}>
                          {m}
                        </option>
                      ),
                    )}
                  </select>
                  <select aria-label="Year" value={f.dobYear} onChange={(e) => set("dobYear", e.target.value)} className={sel}>
                    <option value="">Year</option>
                    {years.map((y) => (
                      <option key={y} value={String(y)}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                {ageText ? (
                  <p className="mt-1 text-xs text-neutral-500">{ageText} on race day</p>
                ) : null}
              </div>
              <div className="sm:col-span-2">
                <Field label="Address / လိပ်စာ">
                  <Input value={f.address} onChange={(e) => set("address", e.target.value)} />
                </Field>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Race / ပြိုင်ပွဲ
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Class * / အတန်း">
                <select required value={f.division} onChange={(e) => set("division", e.target.value)} className={sel}>
                  <option value="">—</option>
                  {divisions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.mm && d.en ? `${d.mm} (${d.en})` : (d.mm ?? d.en ?? d.id)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Team / Club / အသင်း">
                <Input value={f.team_club} onChange={(e) => set("team_club", e.target.value)} />
              </Field>
              {sizes.length > 0 ? (
                <Field label="Jersey size / ဂျာစီ အရွယ်">
                  <select value={f.shirt_size} onChange={(e) => set("shirt_size", e.target.value)} className={sel}>
                    <option value="">—</option>
                    {sizes.map((s) => {
                      const left = hasStock ? sizeLeft(event.shirt_stock, s, paidConfirmedBySize) : null;
                      return (
                        <option key={s} value={s} disabled={left === 0}>
                          {left == null ? s : `${s} — ${left} left`}
                        </option>
                      );
                    })}
                  </select>
                </Field>
              ) : null}
            </div>

            {ageChk.mismatch && suggested ? (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                  Age {ageText ?? "—"} on race day. Class chosen: {chosenDiv?.en ?? f.division}. Suggested:{" "}
                  {suggested.en ?? suggested.id}.
                </div>
                <div className="text-xs text-amber-800">
                  Warning only / သတိပေးချက်သာ — check the NRC photo when it arrives.
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => set("division", suggested.id)}
                >
                  Use {suggested.en ?? suggested.id}
                </Button>
              </div>
            ) : null}

            {bibUsage && bibUsage.capacity > 0 ? (
              <p className={`text-xs ${bibUsage.left <= 0 ? "font-medium text-amber-700" : "text-neutral-500"}`}>
                Bibs for this class ({formatBibRange(chosenDiv!)}): {bibUsage.left} left
                {bibUsage.left <= 0 ? " — no bib numbers free in this class; the rider can still be added, the bib is assigned later." : ""}
              </p>
            ) : null}
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Safety / လုံခြုံရေး
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Blood type / သွေးအုပ်စု">
                <select value={f.blood_type} onChange={(e) => set("blood_type", e.target.value)} className={sel}>
                  <option value="">—</option>
                  {BLOOD_TYPES.map((b) => (
                    <option key={b} value={b}>
                      {b === "unknown" ? "Don't know" : b}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Emergency contact name / အရေးပေါ် ဆက်သွယ်ရန်">
                <Input
                  maxLength={120}
                  value={f.emergency_contact_name}
                  onChange={(e) => set("emergency_contact_name", e.target.value)}
                />
              </Field>
              <Field label="Emergency contact phone / အရေးပေါ် ဖုန်း">
                <Input
                  pattern="[0-9+\- ]{5,30}"
                  inputMode="tel"
                  value={f.emergency_contact_phone}
                  onChange={(e) => set("emergency_contact_phone", e.target.value)}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Note / မှတ်ချက်">
                  <Input maxLength={500} value={f.note} onChange={(e) => set("note", e.target.value)} />
                </Field>
              </div>
            </div>

            <label className="flex items-start gap-2 rounded-lg border border-neutral-200 p-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={f.waiver}
                onChange={(e) => set("waiver", e.target.checked)}
              />
              <span>
                Rider has read and signed the waiver / ပြိုင်ပွဲဝင်သည် စည်းကမ်းချက်များကို ဖတ်ရှုပြီး
                လက်မှတ်ရေးထိုးပြီးဖြစ်သည်
                <span className="block text-xs text-neutral-500">Keep the signed paper with the organizer.</span>
              </span>
            </label>
          </section>

          {dups.length > 0 ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 space-y-2">
              <div className="font-semibold">
                Possible duplicate{dups.length > 1 ? "s" : ""} in this race / ထပ်နေနိုင်သည်:
              </div>
              <ul className="space-y-1">
                {dups.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center gap-2 font-mono text-xs">
                    <span>
                      {d.reference_no ?? "—"} · {d.full_name ?? "—"} · {d.status}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onOpenChange(false);
                        onOpenExisting(d.id);
                      }}
                    >
                      Open existing
                    </Button>
                  </li>
                ))}
              </ul>
              {!dupConfirmed ? (
                <Button type="button" size="sm" variant="secondary" onClick={() => setDupConfirmed(true)}>
                  Add anyway / ထပ်ထည့်ရန်
                </Button>
              ) : (
                <p className="text-xs">Confirmed — saving will add a new rider.</p>
              )}
            </div>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Adding…" : "Add rider / ထည့်ရန်"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-neutral-600">{label}</Label>
      {children}
    </div>
  );
}
