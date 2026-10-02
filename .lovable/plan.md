# Check the live login and Events, then add Change Password

## 1. Check the new admin login (live site)
- Sign in on sayagyi.org as ken@parami.com in a test browser. The password won't be written down or repeated anywhere.
- Confirm the sign-in lands on the Card Desk, and the top bar shows both "Card Desk" and "Events".
- Open Events, then the KBZ MTB 2026 card. Confirm the registration list loads and the "Organizers" link shows up.
- Open the Organizers page and confirm it lists organizers. No invites and no changes to anything.
- Open one registration and check that "View proof" gives a temporary link. No status changes.
- If any step fails, report exactly what showed on screen and fix it.

## 2. Check that the live site is up to date
- Check the publish settings. If the live site is missing the Events pages, publish the current version so sayagyi.org gets them.

## 3. Add a "Change password" screen
- Add a "Change password" item to the top bar for every signed-in user.
- A small window asks for the new password twice. It needs at least 8 characters and both entries must match.
- Saving updates the password for the signed-in account only, then shows a "Password updated" message.
- Then ken@parami.com can replace 123456 right away, and U Htun Htun Win can set his own password later.

## Technical details
- Run the browser checks with Playwright against https://sayagyi.org. Read the login details from the test script only and never print them.
- Change password uses `supabase.auth.updateUser({ password })` with the browser session. No service-role key and no database changes.
- New `ChangePasswordDialog` in `src/components/mcf/`, opened from `TopBar.tsx`.
