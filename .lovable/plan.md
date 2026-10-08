# Add rider flow — Event Registrations

Staff and organizers can add a rider after public registration closed. Insert uses the logged-in session (RLS allows it); the database sets `entry_source='staff'`, `added_by`, `status='registered'`, `bib_no=null`, and generates `reference_no` — none of those are sent. No database changes. No test rider on kbz-mtb-2026.

## What you'll see

- **"Add rider" button** beside Export Excel, visible to anyone managing the event. Opens a full-height drawer on desktop, full-screen sheet on phones.
- **Form, three short sections, bilingual labels:**
  - Rider: full name, phone, NRC number, father's name, date of birth (day/month/year selects like the public form), address.
  - Race: class, team/club, jersey size.
  - Safety: blood type, emergency contact name and phone, note, plus a required waiver checkbox ("Rider accepts the waiver / စည်းမျဉ်းသဘောတူညီမှု").
  - Same required fields and validation as the public form (identical zod rules to Edit rider).
- **Live checks while typing:**
  - Age/class: exact age ("45y 0m on race day") via the existing age-class helper; on mismatch an amber warning with the suggested class and a one-tap "Use 46–60" button that switches the class. Warning only.
  - Duplicates: phone (last 8 digits) or NRC matching a non-cancelled rider in this race shows that rider's name, reference and status with "Open existing" and "Add anyway".
  - Jersey: each size shows numbers left; a size at 0 is disabled. Left = `events.shirt_stock[size]` minus riders in this race with that size and status paid or confirmed. Read live, never hard-coded.
  - Class: shows the bib blocks and numbers left (existing two-block helper). If 0, an amber note appears before saving (warning, not a block — the database assigns bibs later).
- **Save:** one primary "Add rider" button, disabled while saving. On success: close the form, toast "Rider added · KBZMTB26-2026-XXXXXX" with an "Add another" action, and open that rider's detail where payment proof, NRC photos, Paid and bib issue already work.
- **Errors, bilingual, nothing retyped:** a sold-out size ("No L jerseys left. Choose another size."), permission denied, and network failure all keep the typed form data.
- **Traceability:** staff-added rows get a small "Added by staff" tag in the table; the detail shows "Added by {name} on {date}" (name resolved from `mcf_card_staff` / `event_organizers` display names, like uploader names). Excel gains "Entry source" and "Added by" columns; a filter chip "Added by staff: N" (non-cancelled, whole race).
- **Capacity panel:** stays visible when over cap — the Paid + Confirmed line reads "456 / 450 · 6 over cap" in amber.

## Technical details

- **Types** (`db-types.ts`, type-only): `EventRow` gains `shirt_stock?: Record<string, number> | null`; `EventRegistrationRow` gains `entry_source?: string | null` and `added_by?: string | null`.
- **Server fns** (`src/lib/events.functions.ts`, all under `requireStaffOrOrganizer`, session client only — no service role):
  - `addEventRegistration({slug, ...fields, waiverAccepted})` — zod rules identical to `updateRegistrationInfo` (name 2–120, phone digits/+/-, dob real past date, division in `events.divisions`, shirt size in `events.shirt_sizes`, blood type from the nine values or empty). Refuses when the chosen size has 0 left (computed from `shirt_stock` minus paid/confirmed riders) with a clear bilingual error. Inserts exactly the allowed columns plus `event_id` and, when the checkbox is ticked, `waiver_accepted_at = now()`; never sends `entry_source`, `added_by`, `status`, `bib_no`, `reference_no`. Returns the fresh row.
  - `findEventDuplicates({slug, phone, nrc})` — non-cancelled rows in the race where the last 8 phone digits match or NRC matches; returns reference, name, status, id.
  - `listEventRegistrations` — selects add `entry_source`, `added_by`, and `shirt_stock` on the event; summary loop adds paid/confirmed counts per shirt size (for stock) and `staffAddedIds` (whole race, non-cancelled).
  - Added-by names resolved through the existing uploader-name lookup, extended to cover `added_by`.
- **UI:** new `src/components/mcf/events/AddRiderDrawer.tsx` plus a small `src/lib/shirt-stock.ts` helper (`sizeLeft(stock, size, paidConfirmedCounts)`, floored at 0) with vitest tests, including a size at 0 and an over-subscribed size. Duplicate-phone normalisation (last 8 digits) lives in the same test file. RegistrationTable.tsx gains the Add rider button, the staff tag in the Name column, the "Added by staff" chip, the detail "Added by" line, the two Excel columns, and the amber over-cap capacity line. Column count grows accordingly.
- **DB columns I could not read from here:** `entry_source`, `added_by`, `events.shirt_stock` are taken from your confirmation. If any name differs, the first insert call will show a clear Postgres error — tell me and I'll adjust.

## Testing and what is not verified live

- Typecheck, build, and the vitest suite (age rule, bib blocks, new shirt-stock/duplicate helpers) must pass.
- Nothing is inserted on kbz-mtb-2026: the insert path, duplicate matching and stock math are verified against validation and unit tests only. The first real add should be a rider you choose; I'll report exactly what was and wasn't exercised.
