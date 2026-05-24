# Plan: System refinements (7 items)

Scope: incremental additions to current behavior. Existing flows (RLS, schedules, invoices engine) remain untouched.

## 1. Session creation permissions
Already supported at DB level (Admin/Manager via RLS; Teacher via approval flow).
- `Sessions.tsx`: also show `AddSessionDialog` for teachers, restricted to their own students/their `teacher_id`. Hide admin-only fields (rate, salary impact, exception minutes).
- Reuse existing `AddSessionDialog` with a `teacherMode` prop that prefills/locks teacher and limits the student dropdown to assigned students.

## 2. Auto-open report after teacher marks Complete
- In `SessionDetailDialog.tsx`, after teacher confirms `completed` (in `executeStatusChange` / Mark Complete path), if `!isAdmin` call `onOpenReport(selectedSession)` automatically.
- Report form is unchanged (`SessionReportDialog`).
- Teacher can re-open later: in Sessions → Reports view, add an Edit button on each report row (teacher sees only their reports) opening `SessionReportDialog` in edit mode. The dialog now supports `existingReport` prop — preloads fields and does `update` instead of `insert`.

## 3. Admin/Manager: Complete-without-report
- Already true (admin path just calls `updateStatus` with `completed`, no report dialog). Confirmed — no change needed.
- Add/edit report later: same Edit button (item 2) is visible to admin/manager on any report row, plus a new "Add report" button on completed sessions in the list when no report exists yet.

## 4. Teacher edit/delete + file management (admin & manager)
- New `EditTeacherForm.tsx` (mirrors `AddTeacherForm` fields, splits public vs admin-only fields).
- `Teachers.tsx`: add Edit + Delete buttons per card (visible to admin/manager).
  - Edit → dialog with `EditTeacherForm` (updates `teachers` + `profiles`).
  - Delete → `ConfirmDialog`, soft-delete via `teachers.is_active = false`.
- File upload: `TeacherProfileViewer` already shows documents; ensure it exposes upload + delete controls when viewer is admin/manager OR the teacher themselves. Uses existing `teacher-files` bucket and `teacher_documents` table (RLS already correct).

## 5. Explicit Submit button for teacher profile data
- In `TeacherProfileViewer` (teacher self-edit mode): replace any auto-save behavior with a single "Submit" button that persists all profile fields in one mutation and sets `profile_completed = true`.

## 6. WhatsApp share for reports
- After report Submit in `SessionReportDialog`: already shows a WhatsApp button for homework. Extend it to a full **report** message (level + notes + homework) using a new `buildSessionReportMessage()` in `utils/whatsappLinks.ts` (Arabic greeting required per project standards).
- In Reports list (item 2 Edit view) and the existing `showMyReports` panel in `Sessions.tsx`: add a WhatsApp button on every report row for both teacher and admin.
  - Behavior: if student has `guardian_whatsapp`/`whatsapp` → open `wa.me/<number>?text=...`; else open `wa.me/?text=...` (contact picker).

## 7. Session credit tied to invoices + low-balance UI
Data already exists: `students.paid_hours`, `students.remaining_hours`, `invoices.hours`.
- Decrement on session creation: DB trigger `on_session_insert_decrement_credit` — when a session is inserted, `UPDATE students SET remaining_hours = remaining_hours - (duration_minutes/60.0) WHERE id = NEW.student_id`. (Skip for postponed status to avoid double-charging.)
- Add `EditStudentForm` already exposes `remaining_hours` — keep it editable by admin/manager.
- Invoice → credit: when an invoice row goes from non-`paid` to `paid`, add `invoice.hours` (or `invoice_students.hours` sum) to `students.paid_hours` and `students.remaining_hours`. Implemented as DB trigger `on_invoice_paid_credit_hours`.
- Low-balance highlight: in `Sessions.tsx` session list and `TodaySessions` dashboard widget, when `students.remaining_hours <= 2` render the row with `bg-destructive/10 border-destructive`. Already partially done (`isUnpaid` warning at 0). Add new `isLowBalance` (≤2 but >0) → red styling; keep zero/negative as the stronger "unpaid" red.

## Technical notes

- **Files to add**: `src/components/teachers/EditTeacherForm.tsx`, helper `buildSessionReportMessage` in `src/utils/whatsappLinks.ts`.
- **Files to edit**: `Sessions.tsx`, `SessionDetailDialog.tsx`, `SessionReportDialog.tsx` (edit mode + full-report WA share), `Teachers.tsx` (Edit/Delete UI), `TeacherProfileViewer.tsx` (Submit button + uploads visible to teacher), `AddSessionDialog.tsx` (teacherMode), translations.
- **Migrations** (item 7): two triggers — session insert decrements `remaining_hours`; invoice paid adds `paid_hours` + `remaining_hours`. Both `SECURITY DEFINER`, `search_path = public`. Idempotent: invoice trigger only runs when `OLD.status <> 'paid' AND NEW.status = 'paid'`.
- **RLS**: no changes needed; existing teacher/admin/manager policies already cover all reads and writes touched above.
- **i18n**: add keys `editTeacher`, `deleteTeacher`, `confirmDeleteTeacher`, `submitProfile`, `sendReportViaWhatsapp`, `lowBalanceWarning`, `editReport`.

Approve and I'll implement.
