
-- Allow teacher to also set status to 'completed' on postponed sessions (join postponed directly)
DROP POLICY "Teacher can update own session status" ON public.sessions;
CREATE POLICY "Teacher can update own session status" ON public.sessions
  FOR UPDATE TO authenticated
  USING (
    teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid())
    AND status IN ('confirmed', 'completed', 'absent_student')
  );

-- Remove join_postponed from approval types since it's now allowed directly
ALTER TABLE public.approval_requests DROP CONSTRAINT IF EXISTS approval_requests_request_type_check;
ALTER TABLE public.approval_requests ADD CONSTRAINT approval_requests_request_type_check
  CHECK (request_type IN ('reschedule', 'transfer'));

-- Add teacher_paid column to sessions (false for postponed sessions)
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS teacher_paid BOOLEAN DEFAULT true;

-- Trigger: on absent_student, auto-set waiting_minutes=15 and on postponed set teacher_paid=false
CREATE OR REPLACE FUNCTION public.handle_session_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Student absent: cap waiting at 15 minutes
  IF NEW.status = 'absent_student' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.waiting_minutes := 15;
  END IF;

  -- Postponed: don't pay teacher
  IF NEW.status = 'postponed' THEN
    NEW.teacher_paid := false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER session_status_change
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_session_status_change();
