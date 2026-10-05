# Correct the age rule: completed years + 1 once the birthday has passed

The age shown everywhere becomes "completed years on race day, plus 1 if the rider is any days past their birthday". A birthday exactly on race day counts completed years only. Example that pins the rule: born 8 Nov 1981, race 15 Nov 2026 → 45 completed, birthday passed → **46**.

## What changes

- **`src/lib/age-class.ts` — `ageOnDate` only.** After computing completed years, add 1 when the rider's birthday (month/day) is strictly before the race date's month/day. Birthday on race day adds nothing. Still pure `YYYY-MM-DD` string maths, no time zones.
- **Class ranges stay exactly as they are** in `AGE_RULES` (under_18 <18, 18_35 = 18–35, 35_45 = 36–45, 45_60 = 46–60, over_60 >60, open_under_45 <45, women no check) — they now simply evaluate against the corrected age.
- **One number everywhere, automatically.** The DOB column, the rider detail line, the mismatch chip and the Excel export all already read from `ageOnDate`/`checkAgeClass`, so correcting the helper updates every display with no further edits.

## Tests

Update `src/lib/age-class.test.ts` to the new rule:

- born 8 Nov 1981, race 15 Nov 2026 → 46 (the example)
- birthday exactly on race day (15 Nov 2008) → 18, not 19
- day before birthday (16 Nov 2008) → 18 (completed 17 + 1)
- 1 Sep 2008 → 18
- re-pinned class boundaries under the new age: under_18 at 17/18, 18_35 at 35/36, 35_45 at 45/46, 45_60 at 60/61, open_under_45 at 44/45
- women / unknown class / missing DOB still return no alert

## Verification and reporting

- Run the vitest file and the typecheck; confirm the build passes.
- No database changes, no test registrations, Card Desk files untouched.
- I can't read the live registrations from here, so I can't confirm the count myself. After publishing, open kbz-mtb-2026 on sayagyi.org and check the chip reads "Age mismatch: 7". If it doesn't, send me the number and a screenshot of the filtered list.
