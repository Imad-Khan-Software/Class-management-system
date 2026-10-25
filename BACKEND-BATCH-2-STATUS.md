# TeachTrack Backend Batch 2 — Assessments and Marks

## Changes made
- Assessments are loaded directly from the `assessments` table, independently of whether any marks have been entered.
- Class assessment lists and report/export columns now use the independently loaded assessment records, so an assessment can appear even when marks are missing.
- Marks are loaded by their `assessment_id` and matched to the independently loaded assessment records in the client, rather than relying on the embedded relationship response.
- Assessment save/update no longer assumes a unique constraint on `(class_id, category, assessment_name)`. It looks up existing assessments scoped to the signed-in teacher and class, matches the name case-insensitively, and reports duplicate matches instead of choosing one arbitrarily.
- Mark save/update no longer assumes a unique constraint on `(assessment_id, student_id)`. It looks up each mark scoped to the signed-in teacher, assessment, and student, then updates or inserts accordingly.
- Mark writes remain scoped to the authenticated teacher and selected class/assessment. The save button shows a busy state while saving.
- After saving, the app reloads assessments and marks from Supabase and refreshes the UI.
- If an individual mark write fails, the error reports progress and indicates that retrying is safe; the operation is row-by-row and can partially complete.

## Verification
- TypeScript check passed: `tsc --noEmit`.
- ESLint still reports the project's pre-existing issues: `react-hooks/set-state-in-effect` at the auth effect and two `react/no-unescaped-entities` errors, plus unused-variable warnings. Batch 2 did not attempt to clean up unrelated lint issues.
- A production build was not verified in this environment; the previous build attempt could not download Next.js's SWC binary because network access to the npm registry was unavailable.
- No live Supabase save/refresh test was performed from this environment. The user confirmed Batch 1 attendance persistence works; Batch 2 assessment/marks behavior still needs local testing.

## Database and security scope
- No SQL, schema, unique constraints, RLS policies, or triggers were changed.
- No service-role key or `.env.local` is included in the ZIP.
- The implementation deliberately avoids relying on unverified unique constraints. Existing duplicate records are surfaced as errors rather than silently merged.

## Test Batch 2 locally
1. Extract this ZIP to a new folder and create `.env.local` from `.env.local.example` using the existing Supabase project URL and anon/publishable key.
2. Run `npm install`, then `npm run dev`.
3. Sign in, open a class with students, and save a named assessment with marks.
4. Refresh the browser and verify that the assessment and scores remain visible.
5. Open the same assessment again, change one or more scores, save, refresh, and verify the values update rather than creating duplicate rows.
6. Create an assessment name without any marks only if your UI/workflow allows it; otherwise, the direct assessment loading behavior can be validated through existing assessments in Supabase.
