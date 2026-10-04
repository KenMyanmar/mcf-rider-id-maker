# Fix division labels, add emergency contact and shirt size

No database changes. Everything runs on the signed-in person's own access, so organizers still reach only their own event.

## What you'll see
- **Division fixed**: the Division column, the "All divisions" filter, the Edit rider dropdown and the Excel export all show class names. The table shows the Myanmar name, with the English name when you point at it.
- **Size column** in the table, plus a small summary above it, for example "M 4 · L 7 · XL 3". The summary counts every registration for the event that isn't cancelled, whatever filter is on. It is hidden when the event has no shirt sizes.
- **Registration detail** shows labelled rows:
  - Emergency contact (name and a tap-to-call phone)
  - Shirt size
  - NRC number
  - Father's name
  - Date of birth
  - Address
  - Note
  - Waiver accepted time

  The list of raw database field names is removed.
- **Edit rider** adds emergency contact name, emergency contact phone and shirt size. Shirt size is a dropdown of the event's sizes, hidden when the event has none.
- **Excel export**:
  - Division is now two columns: "Division" (English) and "Division (MM)".
  - Three new columns: Emergency contact name, Emergency contact phone and Shirt size.

## Technical details
- `db-types.ts`:
  - `EventDivision` becomes `{ id; en; mm; age_rule_en?; age_rule_mm? }`.
  - `EventRow` gains `shirt_sizes: string[] | null`.
  - `EventRegistrationRow` gains `emergency_contact_name`, `emergency_contact_phone`, `shirt_size` and `waiver_accepted_at`.
- `events.functions.ts`:
  - Both events selects add `shirt_sizes`.
  - The registrations select adds `shirt_size`, `emergency_contact_name` and `emergency_contact_phone`.
  - `listEventRegistrations` also returns `sizeCounts`. A second query reads `shirt_size, status` for the whole event, leaves out cancelled entries and counts per size.
  - `updateRegistrationInfo` validates `emergency_contact_name` (max 120) and `emergency_contact_phone` (same phone rule, optional). `shirt_size` is optional and must be in that event's `shirt_sizes`. Only these three columns are added to the patch; nothing else in it changes.
- `RegistrationTable.tsx`:
  - `divisionLabel` uses `d.mm ?? d.en ?? d.id`; the filter options are fixed the same way.
  - Adds the Size column and the summary line.
  - Detail rows are replaced with labelled rows, and the generic key dump is removed.
- `EditRegistrationDialog.tsx`: fixes the division options and adds the 3 fields. Takes a `shirtSizes` prop.
- Waiver time reads the `waiver_accepted_at` column. If that column has a different name, the waiver row shows a dash and nothing else breaks.
- /work, /work/$reg and /print/$reg are not touched.
