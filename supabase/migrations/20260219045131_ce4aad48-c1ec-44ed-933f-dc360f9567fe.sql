
-- Add postponed status to sessions
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_status_check;
ALTER TABLE public.sessions ADD CONSTRAINT sessions_status_check 
  CHECK (status IN ('upcoming','confirmed','completed','absent_student','absent_teacher','cancelled','postponed'));

-- Approval requests table
CREATE TABLE public.approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES public.teachers(id) NOT NULL,
  session_id UUID REFERENCES public.sessions(id),
  request_type TEXT NOT NULL CHECK (request_type IN ('reschedule','transfer','join_postponed')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  details JSONB DEFAULT '{}',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

-- Teachers can see their OWN sessions (read only + confirm/complete)
CREATE POLICY "Teacher can view own sessions" ON public.sessions
  FOR SELECT TO authenticated
  USING (teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid()));

-- Teachers can update status on their own sessions (accept/complete only)
CREATE POLICY "Teacher can update own session status" ON public.sessions
  FOR UPDATE TO authenticated
  USING (
    teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid())
    AND status IN ('confirmed', 'completed', 'absent_student')
  );

-- Approval requests: teachers create, read own; admin full access
CREATE POLICY "Teacher can create approval requests" ON public.approval_requests
  FOR INSERT TO authenticated
  WITH CHECK (teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid()));

CREATE POLICY "Teacher can view own requests" ON public.approval_requests
  FOR SELECT TO authenticated
  USING (teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid()));

CREATE POLICY "Admin full access approval_requests" ON public.approval_requests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_approval_requests_updated_at BEFORE UPDATE ON public.approval_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
