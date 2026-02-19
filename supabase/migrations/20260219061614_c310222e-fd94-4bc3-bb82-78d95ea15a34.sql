
-- Monthly reports written by teachers for each student
CREATE TABLE public.monthly_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  report_month DATE NOT NULL, -- first day of the month (e.g. 2026-02-01)
  quran_progress TEXT, -- تقدم في الحفظ
  tajweed_level TEXT, -- مستوى التجويد
  attendance_rating TEXT CHECK (attendance_rating IN ('excellent','good','average','poor')),
  behavior_notes TEXT, -- ملاحظات سلوكية
  strengths TEXT, -- نقاط القوة
  weaknesses TEXT, -- نقاط الضعف
  recommendations TEXT, -- توصيات
  overall_grade TEXT CHECK (overall_grade IN ('A','B','C','D','F')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, student_id, report_month)
);

ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admin full access monthly_reports"
ON public.monthly_reports FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Teacher can create reports for own students
CREATE POLICY "Teacher can create own reports"
ON public.monthly_reports FOR INSERT
WITH CHECK (teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid()));

-- Teacher can view own reports
CREATE POLICY "Teacher can view own reports"
ON public.monthly_reports FOR SELECT
USING (teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid()));

-- Teacher can update own reports
CREATE POLICY "Teacher can update own reports"
ON public.monthly_reports FOR UPDATE
USING (teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_monthly_reports_updated_at
BEFORE UPDATE ON public.monthly_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
