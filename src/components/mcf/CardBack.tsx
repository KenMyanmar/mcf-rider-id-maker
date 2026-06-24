import type { McfRiderCardRow, RegistrationMasterRow } from "@/lib/db-types";
import { MCF_YELLOW, MCF_RED } from "./CardFront";

const CARD_W = 342;
const CARD_H = 216;

interface Props {
  rider: RegistrationMasterRow | null;
  card: McfRiderCardRow | null;
  innerRef?: React.Ref<HTMLDivElement>;
}

export function CardBack({ rider, card, innerRef }: Props) {
  const issuedAt = card?.issued_at ? card.issued_at.split("T")[0] : "";
  const rfid = card?.rfid_tag ?? null;

  return (
    <div
      ref={innerRef}
      className="relative overflow-hidden rounded-[10px] shadow-md bg-white text-black"
      style={{ width: CARD_W, height: CARD_H, fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-center text-[9px] font-bold"
        style={{ height: 18, background: MCF_YELLOW }}
      >
        CONDITIONS OF USE
      </div>

      <div className="absolute left-0 right-0 px-4 text-[8px] leading-snug" style={{ top: 22, bottom: 60 }}>
        <ol className="list-decimal pl-3 space-y-[2px]">
          <li>This card is the property of the Myanmar Cycling Federation (MCF).</li>
          <li>The holder must carry this card at every MCF-sanctioned event.</li>
          <li>Misuse, alteration or transfer of this card is prohibited.</li>
          <li>This card is valid only when verified against cyclings.live/verify.</li>
          <li>Return to MCF on request or upon withdrawal from competition.</li>
        </ol>

        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-[2px]">
          <Field label="Reg. No" value={rider?.registration_no ?? card?.registration_no ?? ""} />
          <Field label="Issued" value={issuedAt || "—"} />
          <Field label="RFID" value={rfid ?? "—"} mono />
          <Field label="Member" value={card?.member_no ?? "—"} mono />
        </div>
      </div>

      <div className="absolute left-0 right-0 px-4" style={{ bottom: 26 }}>
        <div className="flex justify-between items-end">
          <div className="text-[7px] text-neutral-600 italic">Authorised signature</div>
          <div className="text-[7px] text-neutral-600 text-right">
            Secretary General<br />
            Myanmar Cycling Federation
          </div>
        </div>
        <div className="border-t border-black/40 mt-3" />
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 flex items-center justify-center text-white text-[8px] font-semibold"
        style={{ height: 18, background: MCF_RED }}
      >
        Myanmar Cycling Federation
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-1 min-w-0">
      <span className="text-[6px] uppercase tracking-wide text-neutral-500">{label}</span>
      <span className={["truncate text-[8px]", mono ? "font-mono" : ""].join(" ")}>{value}</span>
    </div>
  );
}