import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { searchRiders, type RiderSearchHit } from "@/lib/riders.functions";
import { Input } from "@/components/ui/input";

interface Props {
  onPick: (reg: string) => void;
  autoFocus?: boolean;
}

function StatusBadge({ s }: { s: string | null }) {
  if (s === "withdrawn") {
    return (
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-800 border border-red-300">
        withdrawn
      </span>
    );
  }
  if (s === "pending_mcf_verification") {
    return (
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
        pending
      </span>
    );
  }
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-100 text-green-800 border border-green-300">
      verified
    </span>
  );
}

export function RiderSearch({ onPick, autoFocus }: Props) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<RiderSearchHit[]>([]);
  const [busy, setBusy] = useState(false);
  const search = useServerFn(searchRiders);

  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setHits([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const rows = await search({ data: { query: trimmed, limit: 20 } });
        if (!cancelled) setHits(rows);
      } catch (e) {
        console.error(e);
        if (!cancelled) setHits([]);
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, search]);

  return (
    <div className="w-full">
      <Input
        autoFocus={autoFocus}
        placeholder="Search rider — reg no, name (EN/MM), team, UCI ID"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="h-11"
      />
      {q.trim().length >= 2 ? (
        <div className="mt-2 border rounded-md bg-white max-h-72 overflow-auto divide-y">
          {busy && hits.length === 0 ? (
            <div className="p-3 text-sm text-neutral-500">Searching…</div>
          ) : hits.length === 0 ? (
            <div className="p-3 text-sm text-neutral-500">No riders match.</div>
          ) : (
            hits.map((r) => (
              <button
                key={r.registration_no}
                onClick={() => onPick(r.registration_no)}
                className="w-full text-left p-2.5 hover:bg-neutral-50 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {r.name_en ?? "—"}{" "}
                    {r.name_my ? (
                      <span
                        className="text-neutral-500 ml-1"
                        style={{ fontFamily: "'Noto Sans Myanmar', sans-serif" }}
                      >
                        {r.name_my}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-neutral-500 truncate">
                    {r.registration_no} · {r.team_club ?? "—"} · {r.final_category ?? "—"}
                  </div>
                </div>
                <StatusBadge s={r.verification_status ?? null} />
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}