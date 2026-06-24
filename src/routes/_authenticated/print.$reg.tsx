import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getRider, getExistingCard, getSignedPhotoUrl } from "@/lib/riders.functions";
import { CardFront } from "@/components/mcf/CardFront";
import { CardBack } from "@/components/mcf/CardBack";
import type { RegistrationMasterRow, McfRiderCardRow } from "@/lib/db-types";

export const Route = createFileRoute("/_authenticated/print/$reg")({
  head: () => ({ meta: [{ title: "MCF Card — Print" }] }),
  component: PrintPage,
});

function PrintPage() {
  const { reg } = Route.useParams();
  const fetchRider = useServerFn(getRider);
  const fetchCard = useServerFn(getExistingCard);
  const fetchSigned = useServerFn(getSignedPhotoUrl);
  const [rider, setRider] = useState<RegistrationMasterRow | null>(null);
  const [card, setCard] = useState<McfRiderCardRow | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [r, c] = await Promise.all([
        fetchRider({ data: { registration_no: reg } }),
        fetchCard({ data: { registration_no: reg } }),
      ]);
      setRider(r);
      setCard(c);
      if (c?.photo_path) {
        const s = await fetchSigned({ data: { path: c.photo_path } });
        setPhotoUrl(s.url);
      }
    })();
  }, [reg, fetchRider, fetchCard, fetchSigned]);

  if (!rider) return <div className="p-8">Loading…</div>;

  return (
    <div className="min-h-screen bg-white p-8 print:p-0 flex flex-col items-center gap-6 print:gap-2">
      <style>{`@media print { @page { size: A4; margin: 10mm; } body { background: white; } .no-print { display: none !important; } }`}</style>
      <div className="no-print text-xs text-neutral-500">Use browser Print (Ctrl/Cmd+P)</div>
      <CardFront rider={rider} card={card} photoUrl={photoUrl} />
      <CardBack rider={rider} card={card} />
    </div>
  );
}