# Excel export: add Address, cover all filtered rows

## Today's export columns (in order)

Bib · Reference · Name · Phone · Division · Division (MM) · Blood type · Shirt size · Emergency contact name · Emergency contact phone · Status · Status (MM) · Proof · Proof uploaded by · NRC front · NRC back · Created at · Last status change · Note · DOB · Age on race day · Age check · Team/Club

**Address is missing** — so it will be added. Two more gaps found: the export only includes the rows loaded on screen (the server caps the list at 500), and `address` is not even fetched today.

## What changes

**`src/lib/events.functions.ts`**

- Add `address` to the registration select in `listEventRegistrations`.
- Add an `exportAll: true` input option: same filters (status, division, search, age_mismatch), but no 500-row cap and no summary queries — returns every matching row so the export covers the whole filtered set, not just what is on screen.

**`src/components/mcf/events/RegistrationTable.tsx`**

- `exportExcel` calls `listEventRegistrations` with `exportAll: true` and the current filter values, then builds the sheet from that full result.
- New **Address** column right after Phone, from `event_registrations.address`.
- Address cells get wrap-text alignment and a wider column width so long addresses stay readable.

## Verification and reporting

- Typecheck and build must pass; Card Desk and print pages untouched.
- No database changes, no test registrations.
- Not verified signed in: after publishing, open kbz-mtb-2026, apply a filter, export, and confirm the Address column appears after Phone and the row count matches the filtered list.
