
-- Session reports table
CREATE TABLE public.session_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) NOT NULL UNIQUE,
  teacher_id UUID REFERENCES public.teachers(id) NOT NULL,
  student_id UUID REFERENCES public.students(id) NOT NULL,
  student_level TEXT NOT NULL CHECK (student_level IN ('excellent', 'very_good', 'good', 'weak')),
  session_notes TEXT,
  homework TEXT,
  admin_alert BOOLEAN DEFAULT false,
  admin_alert_reason TEXT,
  homework_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.session_reports ENABLE ROW LEVEL SECURITY;

-- Teacher can create reports for their own sessions
CREATE POLICY "Teacher can create own reports" ON public.session_reports
  FOR INSERT TO authenticated
  WITH CHECK (teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid()));

-- Teacher can view own reports
CREATE POLICY "Teacher can view own reports" ON public.session_reports
  FOR SELECT TO authenticated
  USING (teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid()));

-- Admin full access
CREATE POLICY "Admin full access session_reports" ON public.session_reports
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
