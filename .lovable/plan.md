# Upload documents on a rider's behalf

No database changes. Everything runs as the signed-in staff member or organizer; no service-role key.

## What staff and organizers will see

- In the rider detail, a new block **"Upload for rider / ပြိုင်ပွဲဝင်အတွက် တင်ပေးရန်"** with three rows: Payment proof, NRC front, NRC back.
  - Each row shows "On file — {date/time}, by rider" or "by {staff name}", or "Not uploaded".
  - Button reads "Upload", or "Replace" when a file exists (asks to confirm first).
  - On phones the picker offers the camera, so a paper receipt or ID can be photographed directly.
  - Payment proof: JPG, PNG, WebP or PDF. NRC: JPG, PNG or WebP. Max 5 MB each; a clear message otherwise.
  - The whole block is disabled for cancelled riders.
- After upload the row refreshes: "View proof / View NRC front / View NRC back" work immediately and the table's Proof column updates. Status and bib never change.
- Status filter gains "Has proof, not yet Paid" and "No proof yet".
- Excel export gains "Proof uploaded by" (rider / staff).

## Technical details

- `db-types.ts`: add `payment_proof_uploaded_at/by`, `nrc_photo_uploaded_by`, `nrc_photo_back_uploaded_by` (the two NRC `_at` fields already exist).
- `events.functions.ts`:
  - New `uploadRegistrationDocument` (POST, `requireStaffOrOrganizer`). Input is `FormData` with `id`, `kind` (`payment_proof | nrc_front | nrc_back`), `file`; validator checks kind, MIME type per kind and size <= 5 MB.
  - Loads `id, event_id, status` through the user session (RLS scopes organizers); refuses cancelled.
  - Uploads with `context.supabase.storage` and `upsert: false` to `event-payment-proofs` or `event-nrc-photos` at `{event_id}/{id}/staff-{ts}.{ext}`, `nrc-front-staff-{ts}`, `nrc-back-staff-{ts}`.
  - Updates only the one matching path column; on failure reports the error and leaves the object. Returns the refreshed row via `select("*")`.
  - List select adds `payment_proof_uploaded_by`; filter values `proof_not_paid` (`payment_proof_path not null` and status `registered`) and `no_proof` (`payment_proof_path is null`, not cancelled).
  - "by" name: for uploaded_by ids, look up `display_name` in `mcf_card_staff` and `event_organizers` via the session; fall back to "staff" if not readable. Null uploaded_by with a path = "by rider".
- `RegistrationTable.tsx`: new upload block (hidden file inputs, `accept="image/*"` + `capture="environment"` for NRC, `accept="image/*,application/pdf"` for proof without capture so PDF stays choosable), browser-side type/size checks, confirm on Replace, merge returned row and reload list. Filter options and export column.
- Card Desk files (/work, /work/$reg, /print/$reg) untouched. Typecheck after; signed-in upload check left for the user unless a session is available.
