# Event Registrations Area

Add an "Event Registrations" section for MCF staff and event organizers. No database changes — tables (`events`, `event_registrations`, `event_organizers`), RLS policies, and the `event-payment-proofs` bucket already exist on the NC2026 Supabase project. Column names below are verified against the live database.

## What you'll see

- **`/events`** — event picker. Staff see all published events; organizers see only their events. Each card shows the event name (Myanmar first), date, and registration counts by status.
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
- Events are readable only when `published = true` (expected DB behavior).

## Technical details

- **Types** — extend `src/lib/db-types.ts` with `EventRow`, `EventRegistrationRow`, `EventOrganizerRow` and add the tables to `Database`. Add `role: 'staff' | 'admin'` to `McfCardStaffRow`.
- **Access middleware** — new `requireStaffOrOrganizer` in `src/integrations/supabase/auth-middleware.ts` (checks own `mcf_card_staff` row, else own active `event_organizers` row). `requireStaff` stays unchanged so the card desk is untouched.
- **Server fns** — new `src/lib/events.functions.ts`, all zod-validated, using `context.supabase` (user session, RLS decides visibility):
  - `listMyEvents` (staff: all published events + counts; organizer: only their events)
  - `listEventRegistrations(slug, { query, status, division })`
  - `getEventRegistration(id)`
  - `getProofSignedUrl(registrationId)` — reads `payment_proof_path` for that row through the user's session, then signs it for 60 seconds from `event-payment-proofs`. Never accepts a path from the browser.
  - `updateRegistrationStatus(id, status, note)` — updates only `status`/`status_note`
  - `listEventOrganizers(eventId)` — reads through the user session (staff can read all organizer rows)
  - `addEventOrganizer(...)` and `toggleOrganizerActive(...)` — both re-check the caller is an active admin (`mcf_card_staff.role = 'admin'`, no fallback), then write with `supabaseAdmin` loaded inside the handler. `addEventOrganizer` invites/finds the auth user and saves the invited email into the `email` column. These are the only service-role usages.
- **Verified column names** — `events.name_mm` (Myanmar name, not `name_my`); `event_organizers`: `id, user_id, event_id, display_name, email, active, created_at`.
- **Routes** (new files, existing ones untouched except the gate):
  - `src/routes/_authenticated/events.tsx` — event picker
  - `src/routes/_authenticated/events.$slug.tsx` — registration table + detail drawer + status control + Excel export
  - `src/routes/_authenticated/events.$slug.organizers.tsx` — organizers tab (admin only)
  - `src/routes/_authenticated/route.tsx` — gate change only: allow organizers through to `/events*` while `/work*` and `/print/*` keep their existing `requireStaff` server-side enforcement; a non-staff non-organizer sees an empty state.
- **UI** — new components under `src/components/mcf/events/`: `EventPicker`, `RegistrationTable`, `RegistrationDetail`, `StatusControl`, `OrganizersPanel`. Division labels resolved from `events.divisions`. Myanmar-first labels throughout. Excel export via `xlsx` package (new dependency).
- **TopBar** — add an "Events" nav link visible to staff and organizers.

## After launch

`ken@parami.com` has no login yet — sign up on sayagyi.org once this is built, then an admin grants the admin role so the Organizers tab appears.
