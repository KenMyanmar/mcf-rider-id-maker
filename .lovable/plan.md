## Harden Issue write in RiderCardWorkspace

Single-file change: `src/components/mcf/RiderCardWorkspace.tsx`.

### 1. Normalize placeholder bib/RFID values

Add a `clean()` helper inside `persistDraft` (or module scope) that maps empty strings and common placeholders (`none`, `n/a`, `na`, `-`) to `null`, so typed sentinels don't collide with the unique constraint on `bib_no` / `rfid_tag`.

```ts
const clean = (s: string | null | undefined) => {
  const t = (s ?? "").trim();
  return t === "" || /^(none|n\/a|na|-)$/i.test(t) ? null : t;
};
```

Apply to `bib_no` and `rfid_tag` in the `issue({ data: { ... } })` payload. Leave other fields using the existing `value || null` pattern.

### 2. Success toast on issue

In `persistDraft`, after a successful `issue()` call, branch on `status`:

- `status === "issued"` → `toast.success(\`Card issued — ${rider?.name_en ?? reg}\`)`
- `status === "draft"` → keep silent (the SaveStatusChip already shows "Saved")

Photo-only saves currently call `persistDraft` with the prior status, so this won't double-fire the issued toast on a photo capture against a draft card.

### 3. "Issued ✓" badge near action buttons

When `card?.status === "issued"`, render a small green badge inline with the Save/Issue buttons:

```tsx
{card?.status === "issued" ? (
  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 border border-green-300">
    Issued ✓
  </span>
) : null}
```

Placed in the same flex row as `Save draft` / `Issue card`, after the buttons and before `lastError`.

### Out of scope

No schema, route, server-function, or styling-system changes. No edits to other components.

### Verification

- Typecheck passes.
- Manual: enter `N/A` in RFID, click Issue → row saves with `rfid_tag = null` (no unique-constraint error), green toast appears, "Issued ✓" badge shows next to the buttons. Re-open rider → badge persists from loaded `card.status`.
