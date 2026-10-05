// Single source of truth for the age-on-race-day rule and class age ranges.
// Pure date-string maths (YYYY-MM-DD) so time zones never shift an age.

type Range = { min?: number; max?: number };

/** Age range per division id. Divisions not listed (e.g. women) get no check. */
export const AGE_RULES: Record<string, Range> = {
  under_18: { max: 17 },
  "18_35": { min: 18, max: 35 },
  "35_45": { min: 36, max: 45 },
  "45_60": { min: 46, max: 60 },
  over_60: { min: 61 },
  open_under_45: { max: 44 },
};

/** Classes that may be offered as a suggestion (never Open, never Women). */
const SUGGESTABLE = ["under_18", "18_35", "35_45", "45_60", "over_60"];

function parts(d: string | null | undefined): [number, number, number] | null {
  const m = d ? /^(\d{4})-(\d{2})-(\d{2})/.exec(d) : null;
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** Completed years on the event date. */
export function ageOnDate(dob: string | null | undefined, eventDate: string | null | undefined): number | null {
  const b = parts(dob);
  const e = parts(eventDate);
  if (!b || !e) return null;
  let age = e[0] - b[0];
  if (e[1] < b[1] || (e[1] === b[1] && e[2] < b[2])) age--;
  return age;
}

function fits(r: Range, age: number) {
  return (r.min == null || age >= r.min) && (r.max == null || age <= r.max);
}

export type AgeCheck = { age: number | null; mismatch: boolean; suggestedId: string | null };

export function checkAgeClass(
  divisionId: string | null | undefined,
  dob: string | null | undefined,
  eventDate: string | null | undefined,
): AgeCheck {
  const age = ageOnDate(dob, eventDate);
  const rule = divisionId ? AGE_RULES[divisionId] : undefined;
  if (age == null || !rule || fits(rule, age)) return { age, mismatch: false, suggestedId: null };
  const suggestedId = SUGGESTABLE.find((id) => fits(AGE_RULES[id], age)) ?? null;
  return { age, mismatch: true, suggestedId };
}
