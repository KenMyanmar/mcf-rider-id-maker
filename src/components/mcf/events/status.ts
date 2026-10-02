export const STATUS_LABELS: Record<string, { mm: string; en: string }> = {
  registered: { mm: "စာရင်းသွင်းပြီး", en: "Registered" },
  paid: { mm: "ငွေပေးချေပြီး", en: "Paid" },
  confirmed: { mm: "အတည်ပြုပြီး", en: "Confirmed" },
  cancelled: { mm: "ပယ်ဖျက်ပြီး", en: "Cancelled" },
};

export const STATUS_ORDER = ["registered", "paid", "confirmed", "cancelled"];

export function statusLabel(s: string) {
  return STATUS_LABELS[s] ?? { mm: s, en: s };
}

export function statusBadgeClass(s: string) {
  switch (s) {
    case "confirmed":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "paid":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "cancelled":
      return "bg-rose-100 text-rose-800 border-rose-200";
    default:
      return "bg-amber-100 text-amber-800 border-amber-200";
  }
}
