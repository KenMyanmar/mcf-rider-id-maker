# Capacity panel: support a second bib block per class

## What the code does today

- Bib ranges are used in exactly one place: the capacity panel in `RegistrationTable.tsx`. Class size = `bib_end - bib_start + 1`; "only N left" appears at 5 or fewer.
- The bib range itself is not displayed anywhere, and is not in the Excel export.
- The app has no "bib inside class range" check: manual bibs are only checked for uniqueness (database error 23505). Automatic bib numbers come from the database, which this change does not touch.

## Changes

**`src/lib/db-types.ts`**
- `EventDivision` gains optional `bib_start_2`, `bib_end_2`.

**New `src/lib/bib-blocks.ts`** (one place for the rule)
- `bibBlocks(d)` — list of valid `[start, end]` blocks (block 2 only when both ends are set and end >= start).
- `classCapacity(d)` — sum of block sizes.
- `formatBibRange(d)` — "701–800, 851–900".
- `bibInClass(d, bib)` — true if the bib is inside either block.

**`RegistrationTable.tsx` — capacity panel**
- Uses `classCapacity` for the total and "N left".
- Each class line shows its range: "46–60 (701–800, 851–900): 42 / 150".

**Range check (requirement 3)**
- No such check exists today, so nothing is loosened. `bibInClass` is provided and tested so any future check accepts either block; I will not add a new blocking check unless you ask.

**Tests** — `src/lib/bib-blocks.test.ts`: 45_60 capacity 150, women 50, single-block class unchanged; 800 and 851 inside 45_60, 825 not; range text "701–800, 851–900".

No database changes, no test registrations. Card Desk and print pages untouched.

## Expected panel lines on kbz-mtb-2026

- 46–60 (701–800, 851–900): N / 150 — "only X left" only when 5 or fewer remain
- Female (801–850): N / 50

N is the number of non-cancelled riders in that class who hold a bib; I can't read live data, so you confirm N on screen after publishing.
