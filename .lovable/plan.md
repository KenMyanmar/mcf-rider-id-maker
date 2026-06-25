# Fix rider-card navigation 404

## Diagnosis (confirmed)

`_authenticated` is a pathless layout segment, so it is stripped from URLs. The real route fullPaths in `routeTree.gen.ts` are `/work/$reg` and `/print/$reg`. Two call sites in `src/components/mcf/RiderCardWorkspace.tsx` navigate to the literal `/_authenticated/...` path (forced past TypeScript with `as never`) and 404. No route files are missing — only these two URL strings are wrong.

## Changes

**File:** `src/components/mcf/RiderCardWorkspace.tsx` — only this file.

1. `pickRider` — drop the `_authenticated` prefix and the `as never` casts:

   ```tsx
   function pickRider(r: string) {
     setReg(r);
     void navigate({ to: "/work/$reg", params: { reg: r } }).catch(() => undefined);
   }
   ```

2. Print button `window.open` target:

   ```tsx
   window.open(`/print/${encodeURIComponent(reg ?? "")}`, "_blank")
   ```

No changes under `src/routes/`. No server-function, schema, or styling changes.

## Verification

- Typecheck must pass without the `as never` casts (proves the path is in the real `to` union).
- Manual: search → click rider → URL becomes `/work/<reg>`, card populates, no 404. Click "Print page" → `/print/<reg>` opens chromeless view.
- After this lands, run the full pass: search → pick → photo capture → Issue card (exercises bib/RFID write, withdrawn trigger, and service-role photo upload — still unverified end to end).
