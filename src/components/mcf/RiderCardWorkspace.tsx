import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import * as htmlToImage from "html-to-image";
import { jsPDF } from "jspdf";
import {
  getExistingCard,
  getRider,
  getSignedPhotoUrl,
  issueRiderCard,
  uploadRiderPhoto,
} from "@/lib/riders.functions";
import type { McfRiderCardRow, RegistrationMasterRow } from "@/lib/db-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RiderSearch } from "./RiderSearch";
import { CardFront } from "./CardFront";
import { CardBack } from "./CardBack";
import { PhotoCapturePicker } from "./PhotoCaptureField";
import { SaveStatusChip, type SaveState } from "./SaveStatusChip";

interface Props {
  initialReg?: string;
}

type CardDraft = {
  member_no: string;
  bib_no: string;
  rfid_tag: string;
  nrc: string;
  dob: string;
  uci_id: string;
  team_club: string;
  category: string;
  valid_until: string;
};

function emptyDraft(): CardDraft {
  return {
    member_no: "",
    bib_no: "",
    rfid_tag: "",
    nrc: "",
    dob: "",
    uci_id: "",
    team_club: "",
    category: "",
    valid_until: "2026-12-31",
  };
}

function draftFrom(rider: RegistrationMasterRow | null, card: McfRiderCardRow | null): CardDraft {
  return {
    member_no: card?.member_no ?? (rider ? `MCF ${rider.registration_no}` : ""),
    bib_no: card?.bib_no ?? "",
    rfid_tag: card?.rfid_tag ?? "",
    nrc: card?.nrc ?? rider?.nrc_or_passport ?? "",
    dob: (card?.dob ?? rider?.dob ?? "").split("T")[0] ?? "",
    uci_id: card?.uci_id ?? rider?.uci_id ?? "",
    team_club: card?.team_club ?? rider?.team_club ?? "",
    category: card?.category ?? rider?.final_category ?? "",
    valid_until: card?.valid_until ?? "2026-12-31",
  };
}

export function RiderCardWorkspace({ initialReg }: Props) {
  const navigate = useNavigate();
  const fetchRider = useServerFn(getRider);
  const fetchCard = useServerFn(getExistingCard);
  const fetchSigned = useServerFn(getSignedPhotoUrl);
  const upload = useServerFn(uploadRiderPhoto);
  const issue = useServerFn(issueRiderCard);

  const [reg, setReg] = useState<string | null>(initialReg ?? null);
  const [rider, setRider] = useState<RegistrationMasterRow | null>(null);
  const [card, setCard] = useState<McfRiderCardRow | null>(null);
  const [draft, setDraft] = useState<CardDraft>(emptyDraft);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastError, setLastError] = useState<string | null>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  // Load rider + card when reg changes.
  useEffect(() => {
    if (!reg) {
      setRider(null);
      setCard(null);
      setPhotoUrl(null);
      setPhotoPath(null);
      setDraft(emptyDraft());
      return;
    }
    let alive = true;
    void (async () => {
      const [r, c] = await Promise.all([
        fetchRider({ data: { registration_no: reg } }),
        fetchCard({ data: { registration_no: reg } }),
      ]);
      if (!alive) return;
      setRider(r);
      setCard(c);
      setDraft(draftFrom(r, c));
      setPhotoPath(c?.photo_path ?? null);
      if (c?.photo_path) {
        try {
          const s = await fetchSigned({ data: { path: c.photo_path } });
          if (alive) setPhotoUrl(s.url);
        } catch {
          if (alive) setPhotoUrl(null);
        }
      } else {
        setPhotoUrl(null);
      }
      setSaveState("idle");
    })();
    return () => {
      alive = false;
    };
  }, [reg, fetchRider, fetchCard, fetchSigned]);

  const isWithdrawn = rider?.verification_status === "withdrawn";

  const persistDraft = useCallback(
    async (next: CardDraft, nextPhotoPath: string | null, status: "draft" | "issued") => {
      if (!reg) return;
      if (isWithdrawn) {
        toast.error("This rider is withdrawn — card cannot be saved.");
        return;
      }
      setSaveState("saving");
      setLastError(null);
      try {
        const row = await issue({
          data: {
            registration_no: reg,
            member_no: next.member_no || null,
            bib_no: next.bib_no || null,
            rfid_tag: next.rfid_tag || null,
            nrc: next.nrc || null,
            dob: next.dob || null,
            uci_id: next.uci_id || null,
            team_club: next.team_club || null,
            category: next.category || null,
            valid_until: next.valid_until || null,
            photo_path: nextPhotoPath,
            status,
          },
        });
        setCard(row);
        setSaveState("saved");
      } catch (e) {
        const msg = (e as Error).message;
        setLastError(msg);
        setSaveState("error");
        toast.error(msg);
      }
    },
    [reg, issue, isWithdrawn],
  );

  function updateField<K extends keyof CardDraft>(k: K, v: CardDraft[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  async function onPhotoCaptured(b64: string) {
    if (!reg) return;
    setPhotoUrl(b64);
    try {
      const { path } = await upload({
        data: { registration_no: reg, fileBase64: b64, contentType: "image/jpeg" },
      });
      setPhotoPath(path);
      await persistDraft(draft, path, card?.status === "issued" ? "issued" : "draft");
      toast.success("Photo saved");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function onSaveDraft() {
    await persistDraft(draft, photoPath, "draft");
  }

  async function onIssue() {
    await persistDraft(draft, photoPath, "issued");
  }

  async function exportPng(side: "front" | "back") {
    const node = (side === "front" ? frontRef.current : backRef.current);
    if (!node) return;
    await document.fonts.ready;
    const dataUrl = await htmlToImage.toPng(node, {
      pixelRatio: 3.5, // ~300 DPI on a 4 px/mm card
      backgroundColor: "#ffffff",
      cacheBust: true,
    });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${reg ?? "card"}-${side}.png`;
    a.click();
  }

  async function exportPdf() {
    if (!frontRef.current || !backRef.current) return;
    await document.fonts.ready;
    const opts = { pixelRatio: 3.5, backgroundColor: "#ffffff", cacheBust: true } as const;
    const front = await htmlToImage.toPng(frontRef.current, opts);
    const back = await htmlToImage.toPng(backRef.current, opts);
    // CR80: 85.6 x 54 mm
    const pdf = new jsPDF({ unit: "mm", format: [85.6, 54], orientation: "landscape" });
    pdf.addImage(front, "PNG", 0, 0, 85.6, 54);
    pdf.addPage([85.6, 54], "landscape");
    pdf.addImage(back, "PNG", 0, 0, 85.6, 54);
    pdf.save(`${reg ?? "card"}.pdf`);
  }

  function pickRider(r: string) {
    setReg(r);
    void navigate({ to: "/work/$reg", params: { reg: r } }).catch(() => undefined);
  }

  // Preview merges draft into card so the card-as-UI reflects live edits.
  const previewCard: McfRiderCardRow = {
    registration_no: reg ?? "",
    member_no: draft.member_no || null,
    bib_no: draft.bib_no || null,
    rfid_tag: draft.rfid_tag || null,
    nrc: draft.nrc || null,
    dob: draft.dob || null,
    uci_id: draft.uci_id || null,
    team_club: draft.team_club || null,
    category: draft.category || null,
    valid_until: draft.valid_until || null,
    photo_path: photoPath,
    front_card_path: card?.front_card_path ?? null,
    back_card_path: card?.back_card_path ?? null,
    status: card?.status ?? "draft",
    issued_by: card?.issued_by ?? null,
    issued_at: card?.issued_at ?? null,
    updated_at: card?.updated_at ?? null,
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">MCF Rider Card Desk</h1>
        <SaveStatusChip state={saveState} onRetry={() => void persistDraft(draft, photoPath, "draft")} />
      </header>

      <RiderSearch onPick={pickRider} autoFocus={!reg} />

      {reg && !rider ? (
        <div className="text-sm text-neutral-500">Loading rider…</div>
      ) : null}

      {rider ? (
        <div className="grid lg:grid-cols-[auto_1fr] gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <CardFront rider={rider} card={previewCard} photoUrl={photoUrl} innerRef={frontRef} />
              <div className="flex items-center gap-2">
                <PhotoCapturePicker onCaptured={onPhotoCaptured} />
                <Button size="sm" variant="outline" onClick={() => void exportPng("front")}>
                  PNG front
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <CardBack rider={rider} card={previewCard} innerRef={backRef} />
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => void exportPng("back")}>
                  PNG back
                </Button>
                <Button size="sm" variant="outline" onClick={() => void exportPdf()}>
                  PDF (front + back)
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    window.open(
                      `/_authenticated/print/${encodeURIComponent(reg ?? "")}`,
                      "_blank",
                    )
                  }
                >
                  Print page
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {isWithdrawn ? (
              <div className="p-3 rounded-md border border-red-300 bg-red-50 text-sm text-red-800 font-medium">
                ⚠ Rider is WITHDRAWN — issuing this card is blocked.
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <FieldEditor label="Bib No" value={draft.bib_no} onChange={(v) => updateField("bib_no", v)} mono />
              <FieldEditor label="RFID Tag" value={draft.rfid_tag} onChange={(v) => updateField("rfid_tag", v)} mono />
              <FieldEditor label="Member No" value={draft.member_no} onChange={(v) => updateField("member_no", v)} mono />
              <FieldEditor label="Category" value={draft.category} onChange={(v) => updateField("category", v)} />
              <FieldEditor label="Team / Club" value={draft.team_club} onChange={(v) => updateField("team_club", v)} />
              <FieldEditor label="UCI ID" value={draft.uci_id} onChange={(v) => updateField("uci_id", v)} mono />
              <FieldEditor label="NRC" value={draft.nrc} onChange={(v) => updateField("nrc", v)} mono />
              <FieldEditor
                label="DOB"
                type="date"
                value={draft.dob}
                onChange={(v) => updateField("dob", v)}
              />
              <FieldEditor
                label="Valid Until"
                type="date"
                value={draft.valid_until}
                onChange={(v) => updateField("valid_until", v)}
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button onClick={() => void onSaveDraft()} variant="outline" disabled={isWithdrawn}>
                Save draft
              </Button>
              <Button onClick={() => void onIssue()} disabled={isWithdrawn}>
                Issue card
              </Button>
              {lastError ? <span className="text-xs text-red-700">{lastError}</span> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FieldEditor({
  label,
  value,
  onChange,
  mono,
  type,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-neutral-600">{label}</Label>
      <Input
        type={type ?? "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={mono ? "font-mono h-9" : "h-9"}
      />
    </div>
  );
}