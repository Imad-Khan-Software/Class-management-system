TeachTrack professional dashboard upgrade — category totals and editable records
===============================================================================

This ZIP updates the teacher dashboard so the class student table shows:
S.No. | Registration No. | Student Name | Quiz Total | Assignment Total | Attendance | Midterm | Final Term | Details

MARKS AND ASSESSMENTS
- Supports Quiz, Assignment, Midterm Exam, and Final Term Exam.
- The teacher can create as many named quizzes or assignments as needed (for example, Quiz 1, Quiz 2, Quiz 3).
- Quiz and assignment columns total all saved assessments in that category for each student, including the earned marks and maximum marks (for example, 24/30 across three quizzes).
- Midterm and final-term columns show the marks saved for that category.
- Select View details for a student to see each quiz/assignment/exam score separately, category totals, and attendance history.
- Select Edit beside an assessment to load the existing marks for the class and update them. Saving the same category and assessment name updates the existing assessment rather than adding a duplicate.

ATTENDANCE
- Attendance percentage is calculated from saved attendance sessions.
- View details shows the student's attendance history.
- Edit attendance opens the latest recorded session for that student; the date can be changed to another session. Saving a date updates that class's attendance records for the selected date rather than creating duplicates.

SIGN-IN AND ACCESS
- Added a polished sign-in screen with subtle motion, teacher name, email, password, and optional institution details.
- Added sign-out and a single New class button in the top navigation. Other duplicate class-creation buttons have been removed.
- IMPORTANT: sign-in is a front-end demo gate only. It accepts any valid email and a password of at least 4 characters; it does NOT verify identities or protect data on a server. Real authorization requires a backend/auth provider and server-side access controls.

DOWNLOADABLE MARKS SHEET
- Open a class and choose Download marks sheet.
- Downloads an Excel-compatible CSV containing teacher name, email, institution, class/subject/semester/year, date, each student's registration number and name, quiz and assignment totals, attendance percentage, midterm, and final-term marks.
- The CSV can be opened in Excel or Google Sheets and shared with others.

FILES INCLUDED
- src/app/page.tsx
- src/app/globals.css
- src/app/layout.tsx
- Project configuration and public assets

HOW TO APPLY
1. Back up your current project folder.
2. Extract this ZIP.
3. Copy the included project files over the matching files in your existing project.
4. Keep your existing node_modules folder; it is not included in this ZIP.
5. In VS Code's terminal, run: npm run dev
6. Open http://localhost:3000

IMPORTANT
This remains a frontend prototype. Classes, students, attendance, and marks are held in React state and will be cleared when the page is refreshed. The sign-in is a visual/demo gate only, not secure authentication. Do not use it to protect real student records until a real auth provider, server-side authorization, and persistent storage are configured. A full Next.js build/type-check has not been run in this environment.


SUPABASE AUTHENTICATION SETUP (IMPORTANT)
========================================
This version replaces demo login with Supabase email/password authentication. It does not include public Sign Up.

1. Copy .env.local.example to a new file named .env.local in the project root. The project URL and publishable/anon key are already filled in from your Supabase project.
2. In a terminal opened in the project folder, run: npm install
3. In the Supabase Dashboard, open Authentication settings and disable/turn off public sign-ups (the wording may be “Allow new users to sign up”).
4. Open Authentication > Users and add/invite the one teacher account manually. Set the teacher email and password there. You may add user metadata such as full_name and institution if the dashboard offers those fields. Do not create a second account if you want exactly one teacher.
5. Restart the app after setting environment variables: stop the dev server (Ctrl+C), then run npm run dev.
6. Sign in using the email/password for the account created in Supabase. There is no public registration flow.

SECURITY AND DATA LIMITATIONS
=============================
- The anon/publishable key is intended for client use; never place a Supabase service-role or secret key in NEXT_PUBLIC_* variables.
- Disable public sign-ups in Supabase. The app does not expose a sign-up button, but that alone is not a substitute for disabling sign-ups in the Supabase dashboard.
- This step implements Supabase sign-in/sign-out only. Classes, students, marks and attendance are still held in React state and are not saved to the database yet. Do not enter real student data until the database tables, Row Level Security (RLS), and persistence are implemented and verified.
- This client-side app currently gates the workspace based on the Supabase session. Before treating it as production-secure, the next phase must implement database RLS and server-side protection for any server routes or APIs.
- No full Next.js build was run while preparing this archive because package installation timed out in the build environment. Run npm install and npm run build locally to verify.

PERSISTENCE UPDATE (October 2026)
---------------------------------
The Classes and Students forms now write to Supabase and retrieve saved records
when the authorized teacher session loads. If a save fails, the form displays the
Supabase error instead of pretending the record was saved.

Before running:
1. Copy .env.local.example to .env.local.
2. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your project values.
3. Run npm install, then npm run dev.
4. Sign in with the authorized teacher account.
5. Add one test class and student, refresh, and confirm they remain.

Important: existing records that were only in browser React state and disappeared
on a refresh cannot be recovered from Supabase. Re-enter them after this update.
Attendance and marks save handlers still need to be connected to Supabase before
those records can be relied on to persist after refresh.
