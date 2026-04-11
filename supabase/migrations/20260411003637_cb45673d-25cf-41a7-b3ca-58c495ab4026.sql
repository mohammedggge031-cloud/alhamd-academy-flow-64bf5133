
-- Fix teacher-files bucket: make it private
UPDATE storage.buckets SET public = false WHERE id = 'teacher-files';

-- Drop the old public SELECT policy and create authenticated-only one
DROP POLICY IF EXISTS "Public read teacher-files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view teacher files" ON storage.objects;

-- Ensure only authenticated users who own the folder or admins/managers can read
CREATE POLICY "Authenticated read teacher-files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'teacher-files' AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
  )
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_sessions_session_date ON public.sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_sessions_teacher_id ON public.sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_sessions_student_id ON public.sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);
CREATE INDEX IF NOT EXISTS idx_invoices_student_id ON public.invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_students_teacher_id ON public.students(assigned_teacher_id);
CREATE INDEX IF NOT EXISTS idx_students_is_active ON public.students(is_active);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_session_reports_session ON public.session_reports(session_id);
CREATE INDEX IF NOT EXISTS idx_session_reports_teacher ON public.session_reports(teacher_id);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_student ON public.monthly_reports(student_id);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_teacher ON public.monthly_reports(teacher_id);
CREATE INDEX IF NOT EXISTS idx_regulations_order ON public.regulations(section_order);
