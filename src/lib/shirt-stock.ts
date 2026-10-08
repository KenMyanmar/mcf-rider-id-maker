// Jersey stock + duplicate-matching helpers for the staff "Add rider" flow.

/**
 * Jerseys left for a size: events.shirt_stock[size] minus riders in the race
 * with that shirt_size and status 'paid' or 'confirmed'. Never negative.
 */
export function sizeLeft(
  stock: Record<string, number> | null | undefined,
  size: string,
  paidConfirmedCounts: Record<string, number>,
): number {
  const total = stock?.[size] ?? 0;
  const taken = paidConfirmedCounts[size] ?? 0;
  return Math.max(total - taken, 0);
}

/** Last 8 digits of a phone number — the duplicate-match key (numbers arrive in many formats). */
export function last8Phone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.slice(-8);
}

/** True when two phone numbers share their last 8 digits (and both have at least 8). */
export function phonesMatch(a: string, b: string): boolean {
  const da = a.replace(/\D/g, "");
  const db = b.replace(/\D/g, "");
  return da.length >= 8 && db.length >= 8 && da.slice(-8) === db.slice(-8);
}

/** Case-insensitive NRC match; empty strings never match. */
export function nrcMatches(a: string, b: string): boolean {
  const na = a.trim().toLowerCase();
  const nb = b.trim().toLowerCase();
  return na.length > 0 && nb.length > 0 && na === nb;
}
