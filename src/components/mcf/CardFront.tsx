import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import type { McfRiderCardRow, RegistrationMasterRow } from "@/lib/db-types";

// CR80: 85.6 x 54 mm. Render at ~4px / mm = 342 x 216 px on screen.
// At export time we scale up to 300 DPI via html-to-image (pixelRatio).
const CARD_W = 342;
const CARD_H = 216;

export const MCF_YELLOW = "#FECB00";
export const MCF_GREEN = "#34B233";
export const MCF_RED = "#EA1B23";

interface Props {
  rider: RegistrationMasterRow | null;
  card: McfRiderCardRow | null;
  photoUrl?: string | null;
  onPhotoClick?: () => void;
  innerRef?: React.Ref<HTMLDivElement>;
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return "";
  // expect ISO yyyy-mm-dd
  const [y, m, d] = s.split("T")[0].split("-");
  if (!y || !m || !d) return s;
  return `${d}-${m}-${y}`;
}

export function NeedsData({ short = false }: { short?: boolean }) {
  return (
    <span className="inline-block text-[8px] font-semibold tracking-wide text-amber-700 bg-amber-100 border border-amber-300 px-1 py-px rounded">
      {short ? "—" : "Needs data"}
    </span>
  );
}

export function CardFront({ rider, card, photoUrl, onPhotoClick, innerRef }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const reg = rider?.registration_no ?? card?.registration_no ?? "";

  useEffect(() => {
    if (!reg) return;
    void QRCode.toDataURL(`https://cyclings.live/verify/${reg}`, {
      margin: 0,
      width: 96,
      color: { dark: "#000000", light: "#FFFFFF" },
    }).then(setQrDataUrl);
  }, [reg]);

  const memberNo = card?.member_no ?? (reg ? `MCF ${reg}` : null);
  const nameEn = rider?.name_en ?? "—";
  const nameMm = rider?.name_my ?? "";
  const category = card?.category ?? rider?.final_category ?? null;
  const team = card?.team_club ?? rider?.team_club ?? null;
  const dob = fmtDate(card?.dob ?? rider?.dob);
  const uci = card?.uci_id ?? rider?.uci_id ?? null;
  const nrc = card?.nrc ?? rider?.nrc_or_passport ?? null;
  const validUntil = fmtDate(card?.valid_until ?? "2026-12-31");
  const bib = card?.bib_no ?? null;

  return (
    <div
      ref={innerRef}
      className="relative overflow-hidden rounded-[10px] shadow-md bg-white text-black"
      style={{ width: CARD_W, height: CARD_H, fontFamily: "Inter, system-ui, sans-serif" }}
    >
      {/* Top yellow band */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-3"
        style={{ height: 30, background: MCF_YELLOW }}
      >
        <div className="text-[9px] font-bold leading-tight">
          MYANMAR CYCLING<br />FEDERATION
        </div>
        <div className="text-[10px] font-bold tracking-wide">RIDER</div>
        <div className="text-[8px] font-semibold">UCI</div>
      </div>

      {/* Green band */}
      <div
        className="absolute left-0 right-0"
        style={{ top: 30, height: 22, background: MCF_GREEN }}
      />

      {/* Body */}
      <div className="absolute left-0 right-0 px-3 pt-1" style={{ top: 52, bottom: 22 }}>
        <div className="flex gap-3">
          {/* Photo */}
          <button
            type="button"
            onClick={onPhotoClick}
            className="relative flex-shrink-0 border border-neutral-300 bg-neutral-100 overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ width: 70, height: 90 }}
            aria-label="Capture rider photo"
          >
            {photoUrl ? (
              <img src={photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-[8px] text-neutral-500">
                <span className="text-[18px]">📷</span>
                <span>Tap to capture</span>
              </div>
            )}
          </button>

          {/* Fields */}
          <div className="flex-1 min-w-0 text-[9px] leading-[1.25] space-y-[2px]">
            <Row label="Name" value={nameEn} bold />
            {nameMm ? (
              <div
                className="text-[10px] font-medium truncate"
                style={{ fontFamily: "'Noto Sans Myanmar', sans-serif" }}
              >
                {nameMm}
              </div>
            ) : null}
            <Row label="Member No" value={memberNo} mono />
            <Row label="Category" value={category} />
            <Row label="Team / Club" value={team} />
            <div className="grid grid-cols-2 gap-x-2">
              <Row label="DOB" value={dob || null} />
              <Row label="Bib" value={bib} mono bold />
            </div>
            <Row label="UCI ID" value={uci} mono />
            <Row label="NRC" value={nrc} mono />
          </div>
        </div>
      </div>

      {/* Red band */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 text-white text-[8px] font-semibold"
        style={{ height: 22, background: MCF_RED }}
      >
        <span>Valid until {validUntil}</span>
        <span>cyclings.live</span>
      </div>

      {/* QR */}
      {qrDataUrl ? (
        <img
          src={qrDataUrl}
          alt=""
          className="absolute bg-white p-[2px] border border-black/10"
          style={{ right: 6, bottom: 28, width: 44, height: 44 }}
        />
      ) : null}
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  bold,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-1 min-w-0">
      <span className="text-[7px] uppercase tracking-wide text-neutral-500 flex-shrink-0">
        {label}
      </span>
      <span
        className={[
          "truncate",
          mono ? "font-mono" : "",
          bold ? "font-semibold" : "",
        ].join(" ")}
      >
        {value ? value : <NeedsData />}
      </span>
    </div>
  );
}