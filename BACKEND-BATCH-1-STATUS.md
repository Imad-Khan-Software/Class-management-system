# TeachTrack Backend Batch 1 — Attendance Persistence

## Changes made
- Attendance save handler now writes attendance rows to Supabase instead of only updating React state.
- Existing attendance for the same teacher, class, student, and date is updated; otherwise a new row is inserted.
- Save operations are scoped by the authenticated teacher and selected class.
- After saving, attendance is reloaded from Supabase so the UI reflects persisted records.
- The save button shows a saving state and is disabled while the save is running.
- Database errors are shown in the existing error UI.

## Verification
- TypeScript check: passed (`tsc --noEmit`).
- ESLint: existing project errors remain (effect setState rule and two unescaped apostrophes); no claim is made that lint passes.
- Production build: not completed because Next.js attempted to download its SWC binary and network access to registry.npmjs.org was unavailable.
- Live Supabase save/refresh test: not performed from this environment. Test it in your local project before relying on it.

## Important notes
- No database schema, RLS policy, or trigger was changed.
- Attendance writes are performed row-by-row, so a failure midway can leave some students saved and others not saved. The error is surfaced; retrying will update rows already saved.
- Existing `.env.local`, `.git`, `.next`, and `node_modules` were excluded from the ZIP. Create `.env.local` locally with your Supabase project URL and anon key. Never include service-role keys in frontend environment variables.

## Run locally
1. Extract the ZIP.
2. Create `.env.local` from `.env.local.example` and enter your Supabase URL and anon key.
3. Run `npm install`.
4. Run `npm run dev`.
5. Sign in, mark attendance for a class/date, save, refresh, and verify the records remain.
