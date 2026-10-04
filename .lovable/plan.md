# Fix the stale live site for /events/kbz-mtb-2026

## What the investigation found

- The fix is in the code: `RegistrationTable.tsx` uses `d.mm ?? d.en ?? d.id` for the division label, and has the Blood and Size columns and the shirt-size summary.
- The build is clean: no build errors, and the preview server serves the new code (verified directly).
- So the blank division dropdown on the live site is not a code bug. The published site at sayagyi.org is still running an older build from before these changes.

## The fix

Publish the current code so the live site matches:

1. Publish the project (this ships everything already built: division labels, Blood and Size columns, size summary, emergency contact fields, Edit rider, NRC photo buttons).
2. After publishing, open https://sayagyi.org/events/kbz-mtb-2026 and confirm:
   - The table has Blood and Size columns (the sign you're on the new build).
   - The Division column and the "All divisions" dropdown show class names.
   - The shirt-size summary line appears above the table.

## If the live site still shows the old table after publishing

Then the problem is in deployment, not the code, and I'll escalate with the exact evidence: repo has the fix, build is clean, preview serves the new code, published site does not.

## Notes

- No code changes are needed — this is a publish step, not a code fix.
- The reminder about changing the ken@parami.com password still stands.
