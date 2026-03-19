-- ============================================================
-- Alhamd Academy - Full Database Schema
-- Generated: 2026-03-19
-- This file recreates the ENTIRE public schema from scratch.
-- Run this on a fresh Supabase project AFTER creating the project.
-- ============================================================

-- ===================== ENUMS =====================
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'manager');

-- ===================== TABLES =====================

-- Profiles (auto-created on user signup via trigger)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  whatsapp text,
  dot_color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- User Roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Teachers
CREATE TABLE public.teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  age integer,
  hourly_rate numeric NOT NULL DEFAULT 0,
  rate_currency text NOT NULL DEFAULT 'USD',
  rating numeric DEFAULT 0,
  students_count integer DEFAULT 0,
  monthly_hours numeric DEFAULT 0,
  monthly_waiting_minutes integer DEFAULT 0,
  monthly_absence_hours numeric DEFAULT 0,
  monthly_salary numeric DEFAULT 0,
  bonus_amount numeric DEFAULT 0,
  bonus_reason text,
  is_active boolean DEFAULT true,
  profile_completed boolean DEFAULT false,
  show_on_website boolean DEFAULT false,
  qualification text,
  subjects text[] DEFAULT '{}',
  zoom_link text,
  bio text,
  academic_degree text,
  ijazat text,
  gender text DEFAULT 'male',
  website_visible_fields text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Students
CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  age integer,
  assigned_teacher_id uuid REFERENCES public.teachers(id),
  whatsapp text,
  guardian_whatsapp text,
  country text,
  timezone text DEFAULT 'Africa/Cairo',
  remaining_hours numeric DEFAULT 0,
  paid_hours numeric DEFAULT 0,
  attended_hours numeric DEFAULT 0,
  absence_hours numeric DEFAULT 0,
  session_duration_minutes integer DEFAULT 60,
  schedule jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Sessions
CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teachers(id),
  student_id uuid NOT NULL REFERENCES public.students(id),
  session_date date NOT NULL,
  start_time time,
  duration_minutes integer NOT NULL DEFAULT 60,
  waiting_minutes integer DEFAULT 0,
  status text NOT NULL DEFAULT 'upcoming',
  notes text,
  teacher_paid boolean DEFAULT true,
  pending_approval boolean DEFAULT false,
  approval_status text DEFAULT 'none',
  original_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Approval Requests
CREATE TABLE public.approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teachers(id),
  session_id uuid REFERENCES public.sessions(id),
  request_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  details jsonb DEFAULT '{}'::jsonb,
  original_data jsonb,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Session Reports
CREATE TABLE public.session_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL UNIQUE REFERENCES public.sessions(id),
  teacher_id uuid NOT NULL REFERENCES public.teachers(id),
  student_id uuid NOT NULL REFERENCES public.students(id),
  student_level text NOT NULL,
  session_notes text,
  homework text,
  homework_sent boolean DEFAULT false,
  admin_alert boolean DEFAULT false,
  admin_alert_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Monthly Reports
CREATE TABLE public.monthly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id),
  report_month date NOT NULL,
  quran_progress text,
  tajweed_level text,
  attendance_rating text,
  behavior_notes text,
  strengths text,
  weaknesses text,
  recommendations text,
  overall_grade text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Invoices
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.students(id),
  amount numeric NOT NULL,
  discount numeric DEFAULT 0,
  total numeric NOT NULL,
  hours numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  due_date date,
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Invoice Students
CREATE TABLE public.invoice_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id),
  student_id uuid NOT NULL REFERENCES public.students(id),
  hours numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Expenses
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  expense_month date NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Teacher Documents
CREATE TABLE public.teacher_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Trial Bookings
CREATE TABLE public.trial_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  course_interest text,
  preferred_date date,
  preferred_time text,
  timezone text,
  message text,
  status text NOT NULL DEFAULT 'new',
  admin_notes text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Subscription Requests
CREATE TABLE public.subscription_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  plan_name text NOT NULL,
  plan_price text,
  sessions_per_week text,
  message text,
  status text NOT NULL DEFAULT 'new',
  admin_notes text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  type text NOT NULL,
  group_id uuid DEFAULT gen_random_uuid(),
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===================== VIEWS =====================
CREATE OR REPLACE VIEW public.teachers_self_view AS
SELECT id, user_id, age, qualification, hourly_rate, zoom_link, is_active, created_at
FROM public.teachers;

-- ===================== FUNCTIONS =====================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'مستخدم جديد'));
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.handle_session_status_change()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF (OLD.status = 'absent_student' AND NEW.status = 'postponed')
     OR (OLD.status = 'postponed' AND NEW.status = 'absent_student') THEN
    RAISE EXCEPTION 'لا يمكن تأجيل حصة مسجلة غياب أو تسجيل غياب لحصة مؤجلة';
  END IF;
  IF NEW.status = 'absent_student' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.waiting_minutes := 15;
    NEW.teacher_paid := true;
  END IF;
  IF NEW.status = 'postponed' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.teacher_paid := false;
  END IF;
  IF NEW.status = 'completed' AND OLD.status = 'postponed' THEN
    NEW.teacher_paid := true;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _group_ids uuid[];
BEGIN
  SELECT ARRAY_AGG(DISTINCT group_id) INTO _group_ids
  FROM public.notifications WHERE user_id = _user_id AND is_read = false AND group_id IS NOT NULL;
  IF _group_ids IS NOT NULL AND array_length(_group_ids, 1) > 0 THEN
    UPDATE public.notifications SET is_read = true WHERE group_id = ANY(_group_ids);
  END IF;
  UPDATE public.notifications SET is_read = true WHERE user_id = _user_id AND is_read = false;
END; $$;

CREATE OR REPLACE FUNCTION public.mark_notification_group_read(_notification_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _group_id uuid;
BEGIN
  SELECT group_id INTO _group_id FROM public.notifications WHERE id = _notification_id;
  IF _group_id IS NOT NULL THEN
    UPDATE public.notifications SET is_read = true WHERE group_id = _group_id;
  ELSE
    UPDATE public.notifications SET is_read = true WHERE id = _notification_id;
  END IF;
END; $$;

-- ===================== TRIGGERS =====================

-- Auto-create profile on new auth user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at timestamps
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON public.teachers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_approval_requests_updated_at BEFORE UPDATE ON public.approval_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_trial_bookings_updated_at BEFORE UPDATE ON public.trial_bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_subscription_requests_updated_at BEFORE UPDATE ON public.subscription_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_monthly_reports_updated_at BEFORE UPDATE ON public.monthly_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Session status change logic
CREATE TRIGGER handle_session_status BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION handle_session_status_change();

-- ===================== ENABLE RLS =====================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ===================== RLS POLICIES =====================

-- profiles
CREATE POLICY "Admin full access profiles" ON public.profiles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Manager read profiles" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'manager'));
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- user_roles
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can read own role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- teachers
CREATE POLICY "Admin full access teachers" ON public.teachers FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Manager read teachers" ON public.teachers FOR SELECT USING (has_role(auth.uid(), 'manager'));
CREATE POLICY "Manager update teachers" ON public.teachers FOR UPDATE USING (has_role(auth.uid(), 'manager'));
CREATE POLICY "Teacher can read own basic info" ON public.teachers FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Teacher can update own profile" ON public.teachers FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- students
CREATE POLICY "Admin full access students" ON public.students FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Manager read students" ON public.students FOR SELECT USING (has_role(auth.uid(), 'manager'));
CREATE POLICY "Manager write students" ON public.students FOR INSERT WITH CHECK (has_role(auth.uid(), 'manager'));
CREATE POLICY "Manager update students" ON public.students FOR UPDATE USING (has_role(auth.uid(), 'manager'));
CREATE POLICY "Manager delete students" ON public.students FOR DELETE USING (has_role(auth.uid(), 'manager'));

-- sessions
CREATE POLICY "Admin full access sessions" ON public.sessions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Manager read sessions" ON public.sessions FOR SELECT USING (has_role(auth.uid(), 'manager'));
CREATE POLICY "Manager write sessions" ON public.sessions FOR INSERT WITH CHECK (has_role(auth.uid(), 'manager'));
CREATE POLICY "Manager update sessions" ON public.sessions FOR UPDATE USING (has_role(auth.uid(), 'manager'));
CREATE POLICY "Teacher can view own sessions" ON public.sessions FOR SELECT TO authenticated USING (teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()));
CREATE POLICY "Teacher can update own session status" ON public.sessions FOR UPDATE TO authenticated
  USING (teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()))
  WITH CHECK (teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()) AND status = ANY(ARRAY['confirmed','completed','absent_student']));

-- approval_requests
CREATE POLICY "Admin full access approval_requests" ON public.approval_requests FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Manager read approval_requests" ON public.approval_requests FOR SELECT USING (has_role(auth.uid(), 'manager'));
CREATE POLICY "Manager update approval_requests" ON public.approval_requests FOR UPDATE USING (has_role(auth.uid(), 'manager'));
CREATE POLICY "Teacher can create approval requests" ON public.approval_requests FOR INSERT TO authenticated WITH CHECK (teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()));
CREATE POLICY "Teacher can view own requests" ON public.approval_requests FOR SELECT TO authenticated USING (teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()));

-- session_reports
CREATE POLICY "Admin full access session_reports" ON public.session_reports FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Manager read session_reports" ON public.session_reports FOR SELECT USING (has_role(auth.uid(), 'manager'));
CREATE POLICY "Manager create session_reports" ON public.session_reports FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'manager'));
CREATE POLICY "Manager update session_reports" ON public.session_reports FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'manager'));
CREATE POLICY "Teacher can create own reports" ON public.session_reports FOR INSERT TO authenticated WITH CHECK (teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()));
CREATE POLICY "Teacher can view own reports" ON public.session_reports FOR SELECT TO authenticated USING (teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()));

-- monthly_reports
CREATE POLICY "Admin full access monthly_reports" ON public.monthly_reports FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Manager read monthly_reports" ON public.monthly_reports FOR SELECT USING (has_role(auth.uid(), 'manager'));
CREATE POLICY "Manager create monthly_reports" ON public.monthly_reports FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'manager'));
CREATE POLICY "Manager update monthly_reports" ON public.monthly_reports FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'manager'));
CREATE POLICY "Teacher can create own reports" ON public.monthly_reports FOR INSERT WITH CHECK (teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()));
CREATE POLICY "Teacher can update own reports" ON public.monthly_reports FOR UPDATE USING (teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()));
CREATE POLICY "Teacher can view own reports" ON public.monthly_reports FOR SELECT USING (teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()));

-- invoices
CREATE POLICY "Admin full access invoices" ON public.invoices FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Manager read invoices" ON public.invoices FOR SELECT USING (has_role(auth.uid(), 'manager'));
CREATE POLICY "Manager write invoices" ON public.invoices FOR INSERT WITH CHECK (has_role(auth.uid(), 'manager'));
CREATE POLICY "Manager update invoices" ON public.invoices FOR UPDATE USING (has_role(auth.uid(), 'manager'));

-- invoice_students
CREATE POLICY "Admin full access invoice_students" ON public.invoice_students FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Manager read invoice_students" ON public.invoice_students FOR SELECT USING (has_role(auth.uid(), 'manager'));
CREATE POLICY "Manager write invoice_students" ON public.invoice_students FOR INSERT WITH CHECK (has_role(auth.uid(), 'manager'));

-- expenses
CREATE POLICY "Admin full access expenses" ON public.expenses FOR ALL USING (has_role(auth.uid(), 'admin'));

-- teacher_documents
CREATE POLICY "Admin full access teacher_documents" ON public.teacher_documents FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Manager read teacher_documents" ON public.teacher_documents FOR SELECT USING (has_role(auth.uid(), 'manager'));
CREATE POLICY "Teacher manage own documents" ON public.teacher_documents FOR ALL USING (teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())) WITH CHECK (teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()));

-- trial_bookings
CREATE POLICY "Admin full access trial_bookings" ON public.trial_bookings FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can insert trial_bookings" ON public.trial_bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Manager read trial_bookings" ON public.trial_bookings FOR SELECT USING (has_role(auth.uid(), 'manager'));
CREATE POLICY "Manager update trial_bookings" ON public.trial_bookings FOR UPDATE USING (has_role(auth.uid(), 'manager'));

-- subscription_requests
CREATE POLICY "Admin full access subscription_requests" ON public.subscription_requests FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can insert subscription_requests" ON public.subscription_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Manager read subscription_requests" ON public.subscription_requests FOR SELECT USING (has_role(auth.uid(), 'manager'));
CREATE POLICY "Manager update subscription_requests" ON public.subscription_requests FOR UPDATE USING (has_role(auth.uid(), 'manager'));

-- notifications
CREATE POLICY "Admin full access notifications" ON public.notifications FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manager insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "Users can read own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- ===================== STORAGE =====================
-- Create the teacher-files bucket (public)
INSERT INTO storage.buckets (id, name, public) VALUES ('teacher-files', 'teacher-files', true)
ON CONFLICT (id) DO NOTHING;

-- ===================== REALTIME (optional) =====================
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
