# Event Registrations Area

Add an "Event Registrations" section for MCF staff and event organizers. No database changes — tables (`events`, `event_registrations`, `event_organizers`), RLS policies, and the `event-payment-proofs` bucket already exist on the NC2026 Supabase project.

## What you'll see

- **`/events`** — event picker. Staff see all events; organizers see only their events. Each card shows the event name (Myanmar first), date, and registration counts by status.
- **`/events/$slug`** — registration table with search (name / phone / reference), filters (status, division), and Myanmar status labels (စာရင်းသွင်းပြီး / ငွေပေးချေပြီး / အတည်ပြုပြီး / ပယ်ဖျက်ပြီး).
- **Row detail** — full rider info plus a "View proof" button that opens a 60-second signed URL for the payment proof (never a permanent link).
- **Status control** — registered / paid / confirmed / cancelled with an optional note; cancelling asks for confirmation; the last change time shows on the row.
- **Export** — download the current filtered list as Excel.
- **Organizers tab** (admin staff only) — list organizers per event, invite a new organizer by email, toggle active on/off (no delete).

## Access rules

- Staff (`mcf_card_staff` row) and organizers (active `event_organizers` row) can both log in.
- `/events*` is open to both; `/work`, `/work/$reg`, `/print/$reg` stay staff-only.
- Organizers only see/change their own event's rows (enforced by RLS, using the logged-in session — no service-role key for reads or status updates).
- A login that is neither staff nor organizer sees nothing.
- Only `status` and `status_note` are ever updated; the DB records who/when.

## Technical details

- **Types** — extend `src/lib/db-types.ts` with `EventRow`, `EventRegistrationRow`, `EventOrganizerRow` and add the tables to `Database`. Add `role` to `McfCardStaffRow` (spec uses `mcf_card_staff.role = 'admin'`).
- **Access middleware** — new `requireStaffOrOrganizer` in `src/integrations/supabase/auth-middleware.ts` (checks own `mcf_card_staff` row, else own active `event_organizers` row). `requireStaff` stays unchanged so the card desk is untouched.
- **Server fns** — new `src/lib/events.functions.ts`, all zod-validated, using `context.supabase` (user session, RLS decides visibility):
  - `listMyEvents` (staff: all events + counts; organizer: only their events)
  - `listEventRegistrations(slug, { query, status, division })`
  - `getEventRegistration(id)`
  - `getProofSignedUrl(path)` — 60s signed URL from `event-payment-proofs` via the user's session client
  - `updateRegistrationStatus(id, status, note)` — updates only `status`/`status_note`
  - `listEventOrganizers(eventId)`, `addEventOrganizer(...)`, `toggleOrganizerActive(...)` — admin-only; `addEventOrganizer` re-checks the caller is an active admin, then uses `supabaseAdmin` (loaded inside the handler) to invite/find the auth user and insert the row. This is the only service-role usage.
- **Routes** (new files, existing ones untouched except the gate):
  - `src/routes/_authenticated/events.tsx` — event picker
  - `src/routes/_authenticated/events.$slug.tsx` — registration table + detail drawer + status control + Excel export
  - `src/routes/_authenticated/events.$slug.organizers.tsx` — organizers tab (admin only)
  - `src/routes/_authenticated/route.tsx` — gate change only: allow organizers through to `/events*` while `/work*` and `/print/*` keep their existing `requireStaff` server-side enforcement; a non-staff non-organizer sees an empty state.
- **UI** — new components under `src/components/mcf/events/`: `EventPicker`, `RegistrationTable`, `RegistrationDetail`, `StatusControl`, `OrganizersPanel`. Division labels resolved from `events.divisions`. Myanmar-first labels throughout. Excel export via `xlsx` package (new dependency).
- **TopBar** — add an "Events" nav link visible to staff and organizers.

## Assumptions to verify against the live DB first

- Column names on `events` (slug, name_my, name_en, date, divisions), `event_registrations` (reference_no, full_name, phone, division, team_club, status, status_note, payment_proof_path, created_at, status_updated_by/at), and `event_organizers` (user_id, event_id, name, email, active). If any differ, the code follows the real columns.
- `mcf_card_staff` has a `role` column; if not, the Organizers tab falls back to "all active staff are admins" and I'll flag it to you.
