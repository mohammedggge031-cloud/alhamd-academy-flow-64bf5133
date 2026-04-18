-- ============================================================
-- Alhamd Academy - Complete Database Schema
-- Generated: 2026-04-16
-- Safe to run on a fresh Supabase project
-- ============================================================

-- ===================== ENUMS =====================
DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'manager'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===================== TABLES =====================

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text NOT NULL,
  whatsapp text,
  dot_color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS public.teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
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

CREATE TABLE IF NOT EXISTS public.students (
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

CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teachers(id),
  student_id uuid NOT NULL REFERENCES public.students(id),
  session_date date NOT NULL,
  start_time time,
  duration_minutes integer NOT NULL DEFAULT 60,
  waiting_minutes integer DEFAULT 0,
  exception_minutes integer DEFAULT 0,
  status text NOT NULL DEFAULT 'upcoming',
  notes text,
  teacher_paid boolean DEFAULT true,
  pending_approval boolean DEFAULT false,
  approval_status text DEFAULT 'none',
  original_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.approval_requests (
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

CREATE TABLE IF NOT EXISTS public.session_reports (
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

CREATE TABLE IF NOT EXISTS public.monthly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id),
  report_month date NOT NULL,
  quran_progress text, tajweed_level text, attendance_rating text,
  behavior_notes text, strengths text, weaknesses text,
  recommendations text, overall_grade text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.students(id),
  amount numeric NOT NULL, discount numeric DEFAULT 0, total numeric NOT NULL,
  hours numeric DEFAULT 0, status text NOT NULL DEFAULT 'pending',
  due_date date, paid_at timestamptz, notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoice_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id),
  student_id uuid NOT NULL REFERENCES public.students(id),
  hours numeric NOT NULL DEFAULT 0, amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL, description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0, expense_month date NOT NULL,
  created_by uuid, created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.teacher_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  document_type text NOT NULL, file_url text NOT NULL, file_name text NOT NULL,
  description text, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trial_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL, phone text NOT NULL, email text,
  course_interest text, preferred_date date, preferred_time text,
  timezone text, message text, status text NOT NULL DEFAULT 'new',
  admin_notes text, is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscription_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL, phone text NOT NULL, email text,
  plan_name text NOT NULL, plan_price text, sessions_per_week text,
  message text, status text NOT NULL DEFAULT 'new',
  admin_notes text, is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, title text NOT NULL, body text,
  type text NOT NULL, group_id uuid DEFAULT gen_random_uuid(),
  metadata jsonb DEFAULT '{}'::jsonb, is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.academy_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL, value text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

CREATE TABLE IF NOT EXISTS public.regulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_title text NOT NULL, section_title_en text DEFAULT '',
  section_order integer NOT NULL DEFAULT 0,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  items_en jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.external_sync_config (
  id boolean PRIMARY KEY DEFAULT true,
  function_url text NOT NULL, enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.external_sync_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL, operation text NOT NULL,
  record_id uuid, payload jsonb, old_payload jsonb,
  status text NOT NULL DEFAULT 'pending', attempts integer NOT NULL DEFAULT 0,
  last_error text, processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ===================== VIEWS =====================
DROP VIEW IF EXISTS public.teachers_self_view;
CREATE VIEW public.teachers_self_view AS
SELECT id, user_id, age, qualification, hourly_rate, zoom_link, is_active, created_at
FROM public.teachers;
ALTER VIEW public.teachers_self_view SET (security_invoker = on);

DROP VIEW IF EXISTS public.teachers_manager_view;
CREATE VIEW public.teachers_manager_view AS
SELECT id, user_id, age, qualification, subjects, zoom_link, bio,
       academic_degree, ijazat, gender, rating, students_count,
       is_active, profile_completed, show_on_website,
       website_visible_fields, rate_currency, created_at, updated_at
FROM public.teachers;
ALTER VIEW public.teachers_manager_view SET (security_invoker = on);

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
    NEW.waiting_minutes := 15; NEW.teacher_paid := true;
  END IF;
  IF NEW.status = 'postponed' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.teacher_paid := false;
  END IF;
  IF NEW.status = 'completed' AND OLD.status = 'postponed' THEN
    NEW.teacher_paid := true;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.prevent_teacher_financial_self_edit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') AND NOT has_role(auth.uid(), 'manager') THEN
    NEW.hourly_rate := OLD.hourly_rate; NEW.bonus_amount := OLD.bonus_amount;
    NEW.bonus_reason := OLD.bonus_reason; NEW.monthly_salary := OLD.monthly_salary;
    NEW.monthly_hours := OLD.monthly_hours; NEW.monthly_waiting_minutes := OLD.monthly_waiting_minutes;
    NEW.monthly_absence_hours := OLD.monthly_absence_hours; NEW.rate_currency := OLD.rate_currency;
    NEW.students_count := OLD.students_count; NEW.rating := OLD.rating;
    NEW.show_on_website := OLD.show_on_website; NEW.website_visible_fields := OLD.website_visible_fields;
    NEW.is_active := OLD.is_active;
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

CREATE OR REPLACE FUNCTION public.validate_trial_booking_insert()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN NEW.is_read := false; NEW.admin_notes := NULL; NEW.status := 'new'; RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.validate_subscription_request_insert()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN NEW.is_read := false; NEW.admin_notes := NULL; NEW.status := 'new'; RETURN NEW; END; $$;

-- Sync functions
CREATE OR REPLACE FUNCTION public.set_external_sync_config(_function_url text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.external_sync_config (id, function_url, enabled, updated_at)
  VALUES (true, _function_url, true, now())
  ON CONFLICT (id) DO UPDATE SET function_url = EXCLUDED.function_url, enabled = true, updated_at = now();
END; $$;

CREATE OR REPLACE FUNCTION public.request_external_sync_processing()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _function_url text;
  _anon_key text := current_setting('app.settings.anon_key', true);
BEGIN
  SELECT function_url INTO _function_url FROM public.external_sync_config WHERE id = true AND enabled = true;
  IF _function_url IS NULL THEN RETURN; END IF;
  PERFORM net.http_post(
    url := _function_url,
    headers := jsonb_build_object('Content-Type','application/json','apikey',_anon_key,'Authorization','Bearer '||_anon_key),
    body := jsonb_build_object('mode','process_queue')
  );
END; $$;

CREATE OR REPLACE FUNCTION public.enqueue_external_sync_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _table_name text := TG_TABLE_NAME; _record_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _record_id := OLD.id;
    INSERT INTO public.external_sync_events (table_name, operation, record_id, old_payload)
    VALUES (_table_name, lower(TG_OP), _record_id, to_jsonb(OLD));
  ELSE
    _record_id := NEW.id;
    INSERT INTO public.external_sync_events (table_name, operation, record_id, payload, old_payload)
    VALUES (_table_name, lower(TG_OP), _record_id, to_jsonb(NEW), CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE NULL END);
  END IF;
  PERFORM public.request_external_sync_processing();
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE OR REPLACE FUNCTION public.claim_external_sync_events(_limit integer DEFAULT 50)
RETURNS SETOF external_sync_events LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT e.id FROM public.external_sync_events e
    WHERE e.status='pending' OR (e.status='failed' AND e.attempts<20 AND e.updated_at<=now()-make_interval(secs=>LEAST(GREATEST(e.attempts,1)*30,600)))
      OR (e.status='processing' AND e.updated_at<=now()-interval '2 minutes')
    ORDER BY e.created_at LIMIT GREATEST(_limit,1) FOR UPDATE SKIP LOCKED
  ), claimed AS (
    UPDATE public.external_sync_events e SET status='processing', updated_at=now() FROM candidates c WHERE e.id=c.id RETURNING e.*
  ) SELECT * FROM claimed;
END; $$;

CREATE OR REPLACE FUNCTION public.mark_external_sync_event_result(_event_id uuid, _status text, _last_error text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.external_sync_events SET status=_status, attempts=attempts+1, last_error=_last_error,
    processed_at=CASE WHEN _status='processed' THEN now() ELSE processed_at END, updated_at=now() WHERE id=_event_id;
END; $$;

CREATE OR REPLACE FUNCTION public.touch_external_sync_event(_event_id uuid, _last_error text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.external_sync_events SET status='pending', attempts=attempts+1, last_error=_last_error, updated_at=now() WHERE id=_event_id;
END; $$;

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
ALTER TABLE public.academy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_sync_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_sync_events ENABLE ROW LEVEL SECURITY;

-- ===================== STORAGE =====================
INSERT INTO storage.buckets (id, name, public) VALUES ('teacher-files', 'teacher-files', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- NOTE: RLS policies are NOT included here to avoid duplicates.
-- They are already applied via migrations. See supabase/migrations/
-- for the complete policy definitions.
-- ============================================================
