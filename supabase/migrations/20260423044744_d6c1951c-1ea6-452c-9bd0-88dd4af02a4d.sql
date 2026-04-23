-- Allow teachers to SELECT their assigned students (read-only)
-- This fixes My Students page, session detail dialogs, and report dialogs
-- where teachers need student name, whatsapp, remaining_hours, schedule etc.

CREATE POLICY "Teacher can read assigned students"
ON public.students
FOR SELECT
TO authenticated
USING (
  assigned_teacher_id IN (
    SELECT id FROM public.teachers WHERE user_id = auth.uid()
  )
);