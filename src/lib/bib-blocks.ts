import type { EventDivision } from "./db-types";

type Blocks = Pick<EventDivision, "bib_start" | "bib_end" | "bib_start_2" | "bib_end_2">;

/** Valid [start, end] bib blocks for a class (second block optional). */
export function bibBlocks(d: Blocks): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const add = (s?: number | null, e?: number | null) => {
    if (s != null && e != null && e >= s) out.push([s, e]);
  };
  add(d.bib_start, d.bib_end);
  add(d.bib_start_2, d.bib_end_2);
  return out;
}

export function classCapacity(d: Blocks): number {
  return bibBlocks(d).reduce((n, [s, e]) => n + (e - s + 1), 0);
}

export function formatBibRange(d: Blocks): string {
  return bibBlocks(d)
    .map(([s, e]) => `${s}–${e}`)
    .join(", ");
}

export function bibInClass(d: Blocks, bib: number): boolean {
  return bibBlocks(d).some(([s, e]) => bib >= s && bib <= e);
}

/** Used = distinct bib numbers inside the class blocks held by ANY rider in the race. */
export function classBibUsage(d: Blocks, raceBibs: number[]): { capacity: number; used: number; left: number } {
  const capacity = classCapacity(d);
  const used = new Set(raceBibs.filter((b) => bibInClass(d, b))).size;
  return { capacity, used, left: capacity - used };
}
