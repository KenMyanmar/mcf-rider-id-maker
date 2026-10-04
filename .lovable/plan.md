# Bib issuance and capacity alerts for Event Registrations

No database changes. The database assigns bib numbers, enforces Paid-before-Confirmed and the per-division ranges. The app only asks it to do so and shows its messages exactly as returned.

## What staff and organizers will see

- **Bib column** first in the table (dash when empty), sortable by clicking the header. Search also matches an exact bib number.
- **"Paid, no bib"** shortcut in the status filter.
- **Capacity panel** above the table:
  - "Paid + Confirmed: 37 / 450" and "Registered, not yet paid: 12"
  - Per class: "18-35: 12 / 200", with a red note when 5 or fewer bibs are left
  - Amber banner at 80% ("Race is 80% full"), red at 100% ("Cap reached: public registration is now closed. Riders who registered earlier may still pay.")
  - Cap parts hidden when the race has no cap
- **"Issue bibs to all Paid riders (N)"** button: asks to confirm, issues one at a time, oldest registration first, then reports "Issued 12, failed 1" with the reasons.
- **Rider detail**:
  - "Issue bib / နံပါတ်ထုတ်ပေးရန်" primary button when Paid with no bib; toast "Bib 305 issued — {name}", row updates at once to Confirmed + bib.
  - Status dropdown: "Confirmed" disabled unless Paid, hint "Mark Paid first".
  - "Set bib manually" number box (Paid or Confirmed only), with clear option; a taken number shows "Bib 305 is already in use".
- **Excel export**: Bib first column, sorted by bib when any exist.
- Changing a confirmed rider's class in Edit rider refreshes the row so the new bib shows.

## Technical details

- `db-types.ts`: `bib_no: number | null` on EventRegistrationRow; `bib_start?`, `bib_end?` on EventDivision; `max_participants: number | null` on EventRow.
- `events.functions.ts`:
  - Add `max_participants` to both events selects; `bib_no` to the list select, `updateRegistrationStatus` return select (and `select("*")` paths already include it).
  - Capacity counts computed server-side from a whole-event `status, division, bib_no` query (independent of filters), returned as `capacity` alongside `sizeCounts`.
  - Search: if query is all digits, add `bib_no.eq.N` to the `or` filter. Status filter value `paid_no_bib` maps to `status=paid AND bib_no IS NULL`.
  - New `updateRegistrationBib({ id, bib_no: int | null })` with `requireStaffOrOrganizer`, user session + RLS, only patches `bib_no`; refuses unless status is paid/confirmed; unique violation (23505) mapped to "Bib N is already in use"; other DB messages passed through.
  - Database error messages surfaced unchanged in toasts.
- `RegistrationTable.tsx`: Bib column (colSpan 12), client-side bib sort toggle, capacity panel, bulk issue loop (sequential awaits over paid/no-bib rows sorted by created_at, collecting failures), detail Issue bib button and manual bib control, Confirmed option disabled unless current status is paid/confirmed, Excel export changes.
- Organizer scoping unchanged (same middleware + RLS). Card Desk files (/work, /work/$reg, /print/$reg) untouched. Verify typecheck/build after.
