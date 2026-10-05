# Date of birth column and age/class mismatch alert

The brief is solid. It's a warning, not a block, the rule lives in one place, and it says what happens when the class or DOB is unknown. I've tightened three points so it holds up on race-day data:

- **Count across the whole race.** "Age mismatch: N" counts every non-cancelled rider in the race, whatever search or filter is active. Tapping it shows exactly those riders. The same approach as the bulk bib button.
- **Exact date maths.** Age is worked out from the plain dates (birth date vs race date), so a phone's time zone can never shift a rider's age by a day.
- **A test for the age rule.** Small automatic checks pin the boundaries (17/18, 35/36, 45/46, 60/61, birthday exactly on race day), so a later change can't quietly break them.

## What staff and organizers will see

- **New DOB column** right after Division, e.g. "1 Sep 2008 · 18" (age on race day). Team/Club moves to the last column, after Created.
- **Amber highlight** with a warning icon on the Division and DOB cells when the age doesn't fit the class. Hovering shows the reason.
- **Rider detail** shows the same line, in both languages:
  "Age 18 on race day. Class chosen: Under 18. Suggested: 18–35."
  "ပြိုင်ပွဲနေ့တွင် အသက် ၁၈ နှစ်။ ရွေးထားသောအတန်း: … ။ အကြံပြု: … ။"
  (Class names come from the race's own English/Myanmar labels.)
- **"Age mismatch: N" chip** above the table. Tap it to show only those riders; tap again to clear. Cancelled riders are never counted.
- **Warning only.** Status changes and bib issuing work as before. Class changes stay in Edit rider.
- **Excel export** gains DOB, Age on race day and Age check (OK / mismatch, with the suggested class).

## Rules

```text
under_18       age < 18
18_35          18–35
35_45          36–45
45_60          46–60
over_60        age > 60
open_under_45  age < 45
women          no check
unknown class or no DOB / no race date -> no alert
```
Suggestion: the one age class (not Open, not Women) whose range contains the rider's age.

## Technical details

- New `src/lib/age-class.ts` (shared by browser and server):
  - `ageOnDate(dob, eventDate)`: completed years from `YYYY-MM-DD` strings, no time zone involved.
  - `AGE_RULES` table plus `checkAgeClass(divisionId, dob, eventDate)`, returning `{ age, mismatch, suggestedId }`. This is the only place the rule lives.
- Tests in `src/lib/age-class.test.ts` (vitest): one test per boundary above, plus Women / unknown class / missing DOB returning no alert.
- `events.functions.ts` (`listEventRegistrations`):
  - add `dob` to the list select and the whole-event summary query
  - compute `ageMismatchIds` (non-cancelled) and return it
  - new filter value `age_mismatch` limits the list to those ids
- `RegistrationTable.tsx`:
  - DOB column after Division; Team/Club moved last
  - amber cells with an icon and a `title` tooltip
  - chip that toggles the `age_mismatch` filter
  - mismatch line in the detail panel
  - new Excel columns
- No database changes, no test registrations, Card Desk files untouched.

## Reporting the count

I can't sign in to read the live registrations from here, so I can't confirm the count of 11 myself. After the build I'll run the tests and typecheck. Then on sayagyi.org, open kbz-mtb-2026 and check that the chip reads "Age mismatch: 11". If it doesn't, send me the number and a screenshot of the list it filters to.
