DROP POLICY IF EXISTS "Teacher can update own session status" ON public.sessions;

CREATE POLICY "Teacher can update own session status"
ON public.sessions
FOR UPDATE
TO authenticated
USING (
  teacher_id IN (
    SELECT teachers.id FROM teachers WHERE teachers.user_id = auth.uid()
  )
)
WITH CHECK (
  teacher_id IN (
    SELECT teachers.id FROM teachers WHERE teachers.user_id = auth.uid()
  )
  AND status = ANY (ARRAY['confirmed', 'completed', 'absent_student', 'postponed'])
);