# Event Registrations: NRC photos, blood type, edit rider info

No database changes. Every read and write uses the signed-in person's own access, and the service-role key is never used.

## What you'll see
- **Registration detail**:
  - "View NRC front" and "View NRC back" buttons. Each one appears only when that photo exists, and each opens a link that works for 60 seconds.
  - Blood type is shown.
  - "Last edited" shows the time of the last change.
  - An "Edit rider" button.
- **Table**: a new Blood type column. It shows "Don't know" for unknown and a dash when empty.
- **Excel export**: adds Blood type, NRC front (yes/no) and NRC back (yes/no). File locations are never exported.
- **Edit rider dialog** (for staff and that event's organizer):
  - Fields: full name, phone, NRC, father's name, date of birth, address, division (from the event's divisions, Myanmar first), team/club, note and blood type.
  - The button is disabled when the registration is cancelled.
  - After saving, the row and detail update straight away, including the division label.

## Validation (same rules as the public form)
- Name: 2–120 characters.
- Phone: digits, + and - only.
- Date of birth: a real date in the past.
- Division: must be one of this event's divisions.
- Blood type: one of A+, A-, B+, B-, AB+, AB-, O+, O-, unknown. I'm assuming these are the nine allowed values; tell me if the database uses different ones.

## Technical details
- `db-types.ts`: add these to `EventRegistrationRow`:
  - `blood_type`, `nrc_photo_path`, `nrc_photo_uploaded_at`
  - `nrc_photo_back_path`, `nrc_photo_back_uploaded_at`
  - `info_updated_at`, `info_updated_by`
  - `nrc`, `father_name`, `dob`, `address`, `note`
- `events.functions.ts`:
  - `listEventRegistrations` selects `blood_type`, both photo paths (used only to show yes/no) and `info_updated_at`.
  - New `getNrcPhotoSignedUrl({ id, side: 'front' | 'back' })`. It reads the right path column for that row through the user session, then signs it for 60s from the private bucket `event-nrc-photos`. It never takes a path from the browser.
  - New `updateRegistrationInfo({ id, ...fields })`:
    - Zod-validated.
    - Loads the row's event through the user session and checks the division against `events.divisions`.
    - Refuses if the row's status is `cancelled`.
    - The update patch has exactly the ten allowed columns; status, reference_no, event_id, proof path and photo paths are never sent.
    - Returns the updated row; the database records who changed it and when.
  - Both use `requireStaffOrOrganizer`, so row-level security limits organizers to their own event.
- New `src/components/mcf/events/EditRegistrationDialog.tsx`; `RegistrationTable.tsx` gets the column, buttons, export fields and dialog. Raw path and new columns are removed from the generic "extra fields" list in the detail drawer.
- /work, /work/$reg and /print/$reg are not touched.
