// Single source of truth for the age-on-race-day rule and class age ranges.
// Pure date-string maths (YYYY-MM-DD) so time zones never shift an age.

type Range = { min?: number; max?: number };

/** Age range per division id. Divisions not listed (e.g. women) get no check. */
export const AGE_RULES: Record<string, Range> = {
  under_18: { max: 17 },
  "18_35": { min: 18, max: 34 },
  "35_45": { min: 35, max: 44 },
  "45_60": { min: 45, max: 59 },
  over_60: { min: 60 },
  open_under_45: { max: 44 },
};

/** Classes that may be offered as a suggestion (never Open, never Women). */
const SUGGESTABLE = ["under_18", "18_35", "35_45", "45_60", "over_60"];

function parts(d: string | null | undefined): [number, number, number] | null {
  const m = d ? /^(\d{4})-(\d{2})-(\d{2})/.exec(d) : null;
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** Completed years on the event date. A birthday exactly on the event date
 *  has already completed the year. */
export function ageOnDate(dob: string | null | undefined, eventDate: string | null | undefined): number | null {
  const b = parts(dob);
  const e = parts(eventDate);
  if (!b || !e) return null;
  let age = e[0] - b[0];
  if (e[1] < b[1] || (e[1] === b[1] && e[2] < b[2])) age--;
  return age;
}

/** Age as years and months on the event date, e.g. { years: 45, months: 0 }.
 *  Years are completed years (day-adjusted); months are the calendar-month
 *  difference, so 17 Jan -> 15 Nov reads 10m. */
export function ageYearsMonths(
  dob: string | null | undefined,
  eventDate: string | null | undefined,
): { years: number; months: number } | null {
  const b = parts(dob);
  const e = parts(eventDate);
  if (!b || !e) return null;
  let years = e[0] - b[0];
  if (e[1] < b[1] || (e[1] === b[1] && e[2] < b[2])) years--;
  if (years < 0) return null;
  const months = (e[1] - b[1] + 12) % 12;
  return { years, months };
}

/** "45y 0m" — the one age format shown everywhere (DOB column, detail, Excel). */
export function formatAge(dob: string | null | undefined, eventDate: string | null | undefined): string | null {
  const ym = ageYearsMonths(dob, eventDate);
  return ym ? `${ym.years}y ${ym.months}m` : null;
}

function fits(r: Range, age: number) {
  return (r.min == null || age >= r.min) && (r.max == null || age <= r.max);
}

export type AgeCheck = { age: number | null; mismatch: boolean; suggestedId: string | null };

/** Class-check age: completed years, except a rider whose birthday is exactly
 *  on race day and who turns 35, 45 or 60 that day stays in the LOWER class
 *  (checked as one year younger). Turning 18 on race day is 18_35, not under_18. */
function classAge(dob: string, eventDate: string, age: number): number {
  const b = parts(dob);
  const e = parts(eventDate);
  if (b && e && b[1] === e[1] && b[2] === e[2] && (age === 35 || age === 45 || age === 60)) return age - 1;
  return age;
}

export function checkAgeClass(
  divisionId: string | null | undefined,
  dob: string | null | undefined,
  eventDate: string | null | undefined,
): AgeCheck {
  const age = ageOnDate(dob, eventDate);
  const rule = divisionId ? AGE_RULES[divisionId] : undefined;
  if (age == null || !rule || !dob || !eventDate) return { age, mismatch: false, suggestedId: null };
  const a = classAge(dob, eventDate, age);
  if (fits(rule, a)) return { age, mismatch: false, suggestedId: null };
  const suggestedId = SUGGESTABLE.find((id) => fits(AGE_RULES[id], a)) ?? null;
  return { age, mismatch: true, suggestedId };
}
