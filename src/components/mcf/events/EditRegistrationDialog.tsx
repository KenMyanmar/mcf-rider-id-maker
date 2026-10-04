import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { updateRegistrationInfo } from "@/lib/events.functions";
import { BLOOD_TYPES, type EventRegistrationRow, type EventDivision } from "@/lib/db-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type Form = {
  full_name: string;
  phone: string;
  nrc: string;
  father_name: string;
  dob: string;
  address: string;
  division: string;
  team_club: string;
  note: string;
  blood_type: string;
};

function toForm(r: EventRegistrationRow): Form {
  return {
    full_name: r.full_name ?? "",
    phone: r.phone ?? "",
    nrc: r.nrc ?? "",
    father_name: r.father_name ?? "",
    dob: (r.dob ?? "").slice(0, 10),
    address: r.address ?? "",
    division: r.division ?? "",
    team_club: r.team_club ?? "",
    note: r.note ?? "",
    blood_type: r.blood_type ?? "",
  };
}

export function EditRegistrationDialog({
  row,
  divisions,
  open,
  onOpenChange,
  onSaved,
}: {
  row: EventRegistrationRow;
  divisions: EventDivision[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: (r: EventRegistrationRow) => void;
}) {
  const save = useServerFn(updateRegistrationInfo);
  const [f, setF] = useState<Form>(() => toForm(row));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setF(toForm(row));
  }, [open, row]);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const updated = (await save({
        data: {
          id: row.id,
          ...f,
          blood_type: f.blood_type as (typeof BLOOD_TYPES)[number] | "",
        },
      })) as EventRegistrationRow;
      toast.success("Rider info saved");
      onSaved(updated);
      onOpenChange(false);
    } catch (err) {
      const msg = (err as Error).message;
      toast.error(msg.startsWith("[") ? "Please check the fields" : msg);
    } finally {
      setBusy(false);
    }
  }

  const sel = "h-9 w-full rounded-md border border-neutral-200 bg-white px-2 text-sm";
  const field = (k: keyof Form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <Label htmlFor={`er-${k}`}>{label}</Label>
      <Input id={`er-${k}`} value={f[k]} onChange={set(k)} {...props} />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit rider — {row.reference_no ?? ""}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {field("full_name", "Full name", { required: true, minLength: 2, maxLength: 120 })}
          {field("phone", "Phone", { required: true, pattern: "[0-9+\\- ]{5,30}", inputMode: "tel" })}
          {field("nrc", "NRC")}
          {field("father_name", "Father's name")}
          {field("dob", "Date of birth", { type: "date", max: new Date().toISOString().slice(0, 10) })}
          <div>
            <Label htmlFor="er-division">Division</Label>
            <select id="er-division" required value={f.division} onChange={set("division")} className={sel}>
              <option value="">—</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label_mm ? `${d.label_mm} (${d.label})` : d.label}
                </option>
              ))}
            </select>
          </div>
          {field("team_club", "Team / Club")}
          <div>
            <Label htmlFor="er-blood">Blood type</Label>
            <select id="er-blood" value={f.blood_type} onChange={set("blood_type")} className={sel}>
              <option value="">—</option>
              {BLOOD_TYPES.map((b) => (
                <option key={b} value={b}>
                  {b === "unknown" ? "Don't know" : b}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">{field("address", "Address")}</div>
          <div className="sm:col-span-2">{field("note", "Note")}</div>
          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
