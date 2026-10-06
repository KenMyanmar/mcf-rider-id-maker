# Age rule v3: completed years on race day, shifted class boundaries, "Xy Ym" display

Drop the +1 rule. Age is plain completed years on race day (a birthday exactly on race day has already completed the year, so the "stays in the lower class" exception falls out of the maths for free). Class ranges shift down by one to match.

## What changes

**`src/lib/age-class.ts`**

- `ageOnDate`: back to plain completed years — `eventYear - birthYear`, minus 1 if the birthday month/day is after the race month/day. No +1 anywhere. Still pure `YYYY-MM-DD` string maths.
- `AGE_RULES` re-pinned to the new boundaries:
  - under_18: < 18
  - 18_35: 18–34
  - 35_45: 35–44
  - 45_60: 45–59
  - over_60: ≥ 60
  - open_under_45: < 45
  - women / unknown / missing DOB: no check (unchanged)
- New helper `ageYearsMonths(dob, eventDate)` returning `{ years, months }` (months = whole months since the last birthday, 0 on the birthday itself) plus a formatter `formatAge` → `"45y 0m"`. One helper, used everywhere.

**`src/components/mcf/events/RegistrationTable.tsx`**

- DOB column shows `"17 Jan 2009 · 17y 10m"` instead of the integer age.
- Detail mismatch line uses the same format: `"Age 45y 0m on race day. Class chosen: 36–45. Suggested: 46–60."` (bilingual as now).
- Excel export "Age on race day" column shows `"45y 0m"`.
- Chip, amber cells, filter, suggestion logic unchanged — they just read the corrected helper.

**`src/lib/age-class.test.ts`** — rewritten to the new rule:

- 8 Nov 1981, race 15 Nov 2026 → 45y 0m, fits 45_60
- 17 Jan 2009 → 17y 10m, fits under_18
- 15 Nov 2008 (turns 18 on race day) → 18y 0m, fits 18_35; mismatch in under_18
- 16 Nov 2008 → 17y 11m, fits under_18
- 15 Nov 1981 (turns 45 on race day) → 45y 0m, fits 35_45? No — 45 fits 45_60; boundary pins: 34/35 for 18_35→35_45, 44/45 for 35_45→45_60, 59/60 for 45_60→over_60, 44/45 for open_under_45
- women / unknown class / missing DOB still return no alert

## Verification and reporting

- Run the vitest file and the typecheck; confirm the build passes.
- No database changes, no test registrations, Card Desk files untouched.
- The expected chip count on current data is unknown under the new boundaries — after publishing, open kbz-mtb-2026 on sayagyi.org and report the number the chip shows.
