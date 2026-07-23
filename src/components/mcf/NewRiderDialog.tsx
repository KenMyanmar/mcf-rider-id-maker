import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { createRider, findPossibleDuplicates, updateRider } from "@/lib/riders.functions";
import type { RegistrationMasterRow } from "@/lib/db-types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "create" | "edit";
  initial?: RegistrationMasterRow | null;
  onSaved?: (row: RegistrationMasterRow) => void;
}

type Form = {
  name_en: string;
  name_my: string;
  father_name: string;
  phone: string;
  nrc_or_passport: string;
  dob: string;
  gender: string;
  address: string;
  team_club: string;
  final_category: string;
  uci_id: string;
  mcf_id: string;
};

function emptyForm(): Form {
  return {
    name_en: "",
    name_my: "",
    father_name: "",
    phone: "",
    nrc_or_passport: "",
    dob: "",
    gender: "",
    address: "",
    team_club: "",
    final_category: "",
    uci_id: "",
    mcf_id: "",
  };
}

function formFromRider(r: RegistrationMasterRow): Form {
  return {
    name_en: r.name_en ?? "",
    name_my: r.name_my ?? "",
    father_name: r.father_name ?? "",
    phone: r.phone ?? "",
    nrc_or_passport: r.nrc_or_passport ?? "",
    dob: (r.dob ?? "").split("T")[0] ?? "",
    gender: r.gender ?? "",
    address: r.address ?? "",
    team_club: r.team_club ?? "",
    final_category: r.final_category ?? "",
    uci_id: r.uci_id ?? "",
    mcf_id: r.mcf_id ?? "",
  };
}

type Dup = Pick<
  RegistrationMasterRow,
  "registration_no" | "name_en" | "phone" | "team_club" | "verification_status"
>;

export function NewRiderDialog({ open, onOpenChange, mode = "create", initial = null, onSaved }: Props) {
  const navigate = useNavigate();
  const create = useServerFn(createRider);
  const update = useServerFn(updateRider);
  const findDups = useServerFn(findPossibleDuplicates);
  const [f, setF] = useState<Form>(() => (initial ? formFromRider(initial) : emptyForm()));
  const [dups, setDups] = useState<Dup[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const isEdit = mode === "edit" && !!initial;

  useEffect(() => {
    if (open) {
      setF(initial ? formFromRider(initial) : emptyForm());
      setDups([]);
      setConfirming(false);
      setBusy(false);
    }
  }, [open, initial]);

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setF((prev) => ({ ...prev, [k]: v }));
    if (!isEdit && (k === "name_en" || k === "phone")) {
      setDups([]);
      setConfirming(false);
    }
  }

  function reset() {
    setF(emptyForm());
    setDups([]);
    setConfirming(false);
    setBusy(false);
  }

  async function checkDups() {
    if (isEdit) return;
    if (!f.name_en.trim() && !f.phone.trim()) return;
    try {
      const rows = await findDups({
        data: { name_en: f.name_en.trim() || undefined, phone: f.phone.trim() || undefined },
      });
      setDups(rows);
    } catch {
      /* ignore */
    }
  }

  async function onSubmit() {
    if (!f.name_en.trim() || !f.phone.trim()) {
      toast.error("Name (EN) and Phone are required.");
      return;
    }
    if (!isEdit && dups.length > 0 && !confirming) {
      setConfirming(true);
      return;
    }
    setBusy(true);
    try {
      const payload = {
        name_en: f.name_en,
        name_my: f.name_my || null,
        father_name: f.father_name || null,
        phone: f.phone,
        nrc_or_passport: f.nrc_or_passport || null,
        dob: f.dob || null,
        gender: f.gender || null,
        address: f.address || null,
        team_club: f.team_club || null,
        final_category: f.final_category || null,
        uci_id: f.uci_id || null,
        mcf_id: f.mcf_id || null,
      };
      if (isEdit && initial) {
        const row = await update({
          data: { ...payload, registration_no: initial.registration_no },
        });
        toast.success(`Rider updated — ${row.registration_no}`);
        onSaved?.(row);
        onOpenChange(false);
      } else {
        const row = await create({ data: { ...payload, confirm_duplicate: confirming } });
        toast.success(`Rider created — ${row.registration_no}`);
        onSaved?.(row);
        onOpenChange(false);
        reset();
        void navigate({ to: "/work/$reg", params: { reg: row.registration_no } }).catch(
          () => undefined,
        );
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit && initial ? `Edit Rider — ${initial.registration_no}` : "New Rider"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Name (EN) *">
            <Input
              value={f.name_en}
              onChange={(e) => set("name_en", e.target.value)}
              onBlur={() => void checkDups()}
              autoFocus
            />
          </Field>
          <Field label="Name (MM)">
            <Input
              value={f.name_my}
              onChange={(e) => set("name_my", e.target.value)}
              style={{ fontFamily: '"Noto Sans Myanmar", sans-serif' }}
            />
          </Field>
          <Field label="Father Name">
            <Input value={f.father_name} onChange={(e) => set("father_name", e.target.value)} />
          </Field>
          <Field label="Phone *">
            <Input
              value={f.phone}
              onChange={(e) => set("phone", e.target.value)}
              onBlur={() => void checkDups()}
              className="font-mono"
            />
          </Field>
          <Field label="NRC / Passport">
            <Input
              value={f.nrc_or_passport}
              onChange={(e) => set("nrc_or_passport", e.target.value)}
              className="font-mono"
            />
          </Field>
          <Field label="Date of Birth">
            <Input type="date" value={f.dob} onChange={(e) => set("dob", e.target.value)} />
          </Field>
          <Field label="Gender">
            <Select value={f.gender} onValueChange={(v) => set("gender", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Team / Club">
            <Input value={f.team_club} onChange={(e) => set("team_club", e.target.value)} />
          </Field>
          <Field label="Category">
            <Input
              value={f.final_category}
              onChange={(e) => set("final_category", e.target.value)}
            />
          </Field>
          <Field label="UCI ID">
            <Input
              value={f.uci_id}
              onChange={(e) => set("uci_id", e.target.value)}
              className="font-mono"
            />
          </Field>
          <Field label="MCF ID">
            <Input
              value={f.mcf_id}
              onChange={(e) => set("mcf_id", e.target.value)}
              className="font-mono"
            />
          </Field>
          <div className="col-span-2">
            <Field label="Address">
              <Textarea
                value={f.address}
                onChange={(e) => set("address", e.target.value)}
                rows={2}
              />
            </Field>
          </div>
        </div>

        {!isEdit && dups.length > 0 ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 space-y-1">
            <div className="font-semibold">
              Possible duplicate{dups.length > 1 ? "s" : ""} — review before creating:
            </div>
            <ul className="space-y-0.5">
              {dups.map((d) => (
                <li key={d.registration_no} className="font-mono text-xs">
                  {d.registration_no} · {d.name_en ?? "—"}
                  {d.phone ? ` · ${d.phone}` : ""}
                  {d.team_club ? ` · ${d.team_club}` : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void onSubmit()} disabled={busy}>
            {busy
              ? "Saving…"
              : isEdit
                ? "Save changes"
                : dups.length > 0 && confirming
                  ? "Create anyway"
                  : "Create rider"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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