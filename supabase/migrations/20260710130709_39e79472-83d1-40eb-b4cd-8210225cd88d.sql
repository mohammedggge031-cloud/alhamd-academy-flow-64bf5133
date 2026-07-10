
-- =====================================================================
-- M1: Ledger-based Financial Core
-- =====================================================================

-- 1) NEW COLUMNS -------------------------------------------------------

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS subscription_hours numeric,
  ADD COLUMN IF NOT EXISTS subscription_start_date date,
  ADD COLUMN IF NOT EXISTS subscription_end_date date,
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS current_package_id uuid;

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS absence_reviewed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS absence_decision text,
  ADD COLUMN IF NOT EXISTS absence_reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS absence_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_by_teacher boolean NOT NULL DEFAULT false;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS package_id uuid;

-- 2) subscription_packages --------------------------------------------

CREATE TABLE IF NOT EXISTS public.subscription_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  hours numeric NOT NULL CHECK (hours > 0),
  price numeric NOT NULL CHECK (price >= 0),
  currency text NOT NULL DEFAULT 'EGP',
  validity_days integer NOT NULL DEFAULT 30 CHECK (validity_days > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_packages TO authenticated;
GRANT ALL ON public.subscription_packages TO service_role;
ALTER TABLE public.subscription_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pkg_admin_all" ON public.subscription_packages FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "pkg_authenticated_read_active" ON public.subscription_packages FOR SELECT TO authenticated
  USING (is_active = true OR has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_pkg_updated_at BEFORE UPDATE ON public.subscription_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3) student_ledger ---------------------------------------------------

CREATE TABLE IF NOT EXISTS public.student_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  entry_type text NOT NULL CHECK (entry_type IN (
    'purchase','session_deducted','absence_charged','absence_refunded',
    'manual_adjustment','refund','bonus_session'
  )),
  hours_delta numeric NOT NULL DEFAULT 0,
  amount_delta numeric NOT NULL DEFAULT 0,
  session_id uuid,
  invoice_id uuid,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_student_ledger_student ON public.student_ledger(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_ledger_session ON public.student_ledger(session_id);
CREATE INDEX IF NOT EXISTS idx_student_ledger_invoice ON public.student_ledger(invoice_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_ledger TO authenticated;
GRANT ALL ON public.student_ledger TO service_role;
ALTER TABLE public.student_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sl_admin_all" ON public.student_ledger FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "sl_manager_read" ON public.student_ledger FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'manager'));
CREATE POLICY "sl_teacher_read_own_students" ON public.student_ledger FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.teachers t ON t.id = s.assigned_teacher_id
    WHERE s.id = student_ledger.student_id AND t.user_id = auth.uid()
  ));
CREATE POLICY "sl_parent_read_own" ON public.student_ledger FOR SELECT TO authenticated
  USING (public.is_parent_of(auth.uid(), student_id));

-- 4) teacher_ledger ---------------------------------------------------

CREATE TABLE IF NOT EXISTS public.teacher_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  entry_type text NOT NULL CHECK (entry_type IN (
    'session_paid','waiting_paid','absence_paid_15min','bonus','deduction','salary_payout'
  )),
  minutes integer NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  session_id uuid,
  payroll_month date,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teacher_ledger_teacher ON public.teacher_ledger(teacher_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_ledger_session ON public.teacher_ledger(session_id);
CREATE INDEX IF NOT EXISTS idx_teacher_ledger_month ON public.teacher_ledger(teacher_id, payroll_month);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_ledger TO authenticated;
GRANT ALL ON public.teacher_ledger TO service_role;
ALTER TABLE public.teacher_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tl_admin_all" ON public.teacher_ledger FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "tl_teacher_read_own" ON public.teacher_ledger FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.teachers t WHERE t.id = teacher_ledger.teacher_id AND t.user_id = auth.uid()
  ));

-- Academic view without amounts for managers
CREATE OR REPLACE VIEW public.teacher_ledger_academic_view AS
SELECT id, teacher_id, entry_type, minutes, session_id, payroll_month, notes, created_at
FROM public.teacher_ledger;
GRANT SELECT ON public.teacher_ledger_academic_view TO authenticated;

-- 5) session_edit_requests -------------------------------------------

CREATE TABLE IF NOT EXISTS public.session_edit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  requested_changes jsonb NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ser_status ON public.session_edit_requests(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_edit_requests TO authenticated;
GRANT ALL ON public.session_edit_requests TO service_role;
ALTER TABLE public.session_edit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ser_admin_all" ON public.session_edit_requests FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "ser_manager_all" ON public.session_edit_requests FOR ALL TO authenticated
  USING (has_role(auth.uid(),'manager')) WITH CHECK (has_role(auth.uid(),'manager'));
CREATE POLICY "ser_teacher_insert_own" ON public.session_edit_requests FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.teachers t WHERE t.id = session_edit_requests.teacher_id AND t.user_id = auth.uid()
  ));
CREATE POLICY "ser_teacher_read_own" ON public.session_edit_requests FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.teachers t WHERE t.id = session_edit_requests.teacher_id AND t.user_id = auth.uid()
  ));

CREATE TRIGGER trg_ser_updated_at BEFORE UPDATE ON public.session_edit_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 6) CORE FUNCTIONS ---------------------------------------------------

CREATE OR REPLACE FUNCTION public.recalc_student_balance(_student_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _hours numeric := 0;
BEGIN
  SELECT COALESCE(SUM(hours_delta),0) INTO _hours
    FROM public.student_ledger WHERE student_id = _student_id;
  UPDATE public.students
     SET remaining_hours = _hours, updated_at = now()
   WHERE id = _student_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalc_subscription_status(_student_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _remaining numeric; _end date; _new text;
BEGIN
  SELECT remaining_hours, subscription_end_date INTO _remaining, _end
    FROM public.students WHERE id = _student_id;

  IF _end IS NOT NULL AND _end < CURRENT_DATE THEN
    _new := 'expired';
  ELSIF COALESCE(_remaining,0) <= 0 THEN
    _new := CASE WHEN _end IS NULL THEN 'none' ELSE 'expired' END;
  ELSIF _remaining <= 2 THEN
    _new := 'expiring_soon';
  ELSE
    _new := 'active';
  END IF;

  UPDATE public.students SET subscription_status = _new, updated_at = now()
   WHERE id = _student_id AND COALESCE(subscription_status,'') IS DISTINCT FROM _new;
END;
$$;

-- Trigger: any ledger change → recalc balance + status
CREATE OR REPLACE FUNCTION public.trg_student_ledger_recalc()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _sid uuid;
BEGIN
  _sid := COALESCE(NEW.student_id, OLD.student_id);
  PERFORM public.recalc_student_balance(_sid);
  PERFORM public.recalc_subscription_status(_sid);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_student_ledger_recalc ON public.student_ledger;
CREATE TRIGGER trg_student_ledger_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.student_ledger
FOR EACH ROW EXECUTE FUNCTION public.trg_student_ledger_recalc();

-- 7) Replace legacy triggers with ledger-based flow -------------------

-- Invoice paid → purchase ledger entry + activate subscription
CREATE OR REPLACE FUNCTION public.credit_student_on_invoice_paid()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _hours numeric; _validity int := 30; _price numeric;
BEGIN
  IF NEW.status = 'paid'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'paid')
     AND NEW.student_id IS NOT NULL THEN

    _hours := COALESCE(NEW.hours, 0);
    _price := COALESCE(NEW.total, NEW.amount, 0);

    IF NEW.package_id IS NOT NULL THEN
      SELECT hours, validity_days, price INTO _hours, _validity, _price
        FROM public.subscription_packages WHERE id = NEW.package_id;
    END IF;

    IF _hours > 0 THEN
      -- purchase ledger entry
      INSERT INTO public.student_ledger (student_id, entry_type, hours_delta, amount_delta, invoice_id, notes, created_by)
      VALUES (NEW.student_id, 'purchase', _hours, _price, NEW.id, 'Invoice paid', auth.uid());

      -- Subscription window
      UPDATE public.students
         SET subscription_hours = _hours,
             subscription_start_date = CURRENT_DATE,
             subscription_end_date = CURRENT_DATE + (_validity || ' days')::interval,
             current_package_id = NEW.package_id,
             paid_hours = COALESCE(paid_hours,0) + _hours,
             updated_at = now()
       WHERE id = NEW.student_id;

      PERFORM public.recalc_subscription_status(NEW.student_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Session flow → ledger entries (replaces direct decrement)
CREATE OR REPLACE FUNCTION public.decrement_student_hours_on_session()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _hours numeric;
  _rate numeric;
  _new_status text := NEW.status;
  _old_status text := CASE WHEN TG_OP='UPDATE' THEN OLD.status ELSE NULL END;
BEGIN
  IF TG_OP = 'INSERT' AND _new_status IN ('scheduled','postponed','cancelled') THEN
    RETURN NEW;
  END IF;

  _hours := COALESCE(NEW.duration_minutes,60)::numeric / 60.0;
  SELECT hourly_rate INTO _rate FROM public.teachers WHERE id = NEW.teacher_id;

  -- Completed
  IF _new_status = 'completed' AND (_old_status IS DISTINCT FROM 'completed') THEN
    -- avoid double insert
    IF NOT EXISTS (SELECT 1 FROM public.student_ledger WHERE session_id = NEW.id AND entry_type='session_deducted') THEN
      INSERT INTO public.student_ledger (student_id, entry_type, hours_delta, session_id, notes, created_by)
      VALUES (NEW.student_id, 'session_deducted', -_hours, NEW.id, 'Session completed', auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.teacher_ledger WHERE session_id = NEW.id AND entry_type='session_paid') THEN
      INSERT INTO public.teacher_ledger (teacher_id, entry_type, minutes, amount, session_id, payroll_month, notes, created_by)
      VALUES (NEW.teacher_id, 'session_paid', COALESCE(NEW.duration_minutes,60),
              ROUND((_rate * _hours)::numeric,2), NEW.id,
              date_trunc('month', NEW.session_date)::date, 'Session completed', auth.uid());
    END IF;

  -- Student absent
  ELSIF _new_status = 'absent_student' AND (_old_status IS DISTINCT FROM 'absent_student') THEN
    IF NOT EXISTS (SELECT 1 FROM public.student_ledger WHERE session_id = NEW.id AND entry_type='absence_charged') THEN
      INSERT INTO public.student_ledger (student_id, entry_type, hours_delta, session_id, notes, created_by)
      VALUES (NEW.student_id, 'absence_charged', -_hours, NEW.id, 'Student absent', auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.teacher_ledger WHERE session_id = NEW.id AND entry_type='absence_paid_15min') THEN
      INSERT INTO public.teacher_ledger (teacher_id, entry_type, minutes, amount, session_id, payroll_month, notes, created_by)
      VALUES (NEW.teacher_id, 'absence_paid_15min', 15,
              ROUND((_rate * 0.25)::numeric,2), NEW.id,
              date_trunc('month', NEW.session_date)::date, 'Absent student (15m)', auth.uid());
    END IF;
    NEW.absence_reviewed := false;
  END IF;

  RETURN NEW;
END;
$$;

-- Absence decision RPC
CREATE OR REPLACE FUNCTION public.apply_absence_decision(_session_id uuid, _decision text, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _sess record; _hours numeric; _rate numeric;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _decision NOT IN ('count_on_student','excused','teacher_fault') THEN
    RAISE EXCEPTION 'invalid decision';
  END IF;

  SELECT * INTO _sess FROM public.sessions WHERE id = _session_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'session not found'; END IF;

  _hours := COALESCE(_sess.duration_minutes,60)::numeric / 60.0;
  SELECT hourly_rate INTO _rate FROM public.teachers WHERE id = _sess.teacher_id;

  IF _decision = 'excused' THEN
    INSERT INTO public.student_ledger (student_id, entry_type, hours_delta, session_id, notes, created_by)
    VALUES (_sess.student_id, 'absence_refunded', _hours, _session_id, COALESCE(_reason,'Excused'), auth.uid());

  ELSIF _decision = 'teacher_fault' THEN
    INSERT INTO public.student_ledger (student_id, entry_type, hours_delta, session_id, notes, created_by)
    VALUES (_sess.student_id, 'absence_refunded', _hours, _session_id, COALESCE(_reason,'Teacher fault'), auth.uid());
    -- Reverse the 15-min payment
    INSERT INTO public.teacher_ledger (teacher_id, entry_type, minutes, amount, session_id, payroll_month, notes, created_by)
    VALUES (_sess.teacher_id, 'deduction', -15, ROUND((-_rate * 0.25)::numeric,2), _session_id,
            date_trunc('month', _sess.session_date)::date, 'Teacher-fault reversal', auth.uid());
  END IF;

  UPDATE public.sessions
     SET absence_reviewed = true,
         absence_decision = _decision,
         absence_reviewed_by = auth.uid(),
         absence_reviewed_at = now()
   WHERE id = _session_id;
END;
$$;

-- Bonus session RPC
CREATE OR REPLACE FUNCTION public.add_bonus_session(_student_id uuid, _hours numeric, _reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _hours <= 0 THEN RAISE EXCEPTION 'hours must be positive'; END IF;
  IF _reason IS NULL OR length(trim(_reason)) = 0 THEN RAISE EXCEPTION 'reason required'; END IF;

  INSERT INTO public.student_ledger (student_id, entry_type, hours_delta, notes, created_by)
  VALUES (_student_id, 'bonus_session', _hours, _reason, auth.uid())
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

-- Daily refresh of subscription statuses
CREATE OR REPLACE FUNCTION public.refresh_all_subscription_statuses()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _r record;
BEGIN
  FOR _r IN SELECT id FROM public.students LOOP
    PERFORM public.recalc_subscription_status(_r.id);
  END LOOP;
END;
$$;

-- 8) BACKFILL --------------------------------------------------------

-- Purchases from paid invoices
INSERT INTO public.student_ledger (student_id, entry_type, hours_delta, amount_delta, invoice_id, notes, created_at)
SELECT i.student_id, 'purchase', COALESCE(i.hours,0), COALESCE(i.total, i.amount, 0), i.id, 'Backfill: paid invoice', COALESCE(i.paid_at, i.created_at)
FROM public.invoices i
WHERE i.status = 'paid'
  AND i.student_id IS NOT NULL
  AND COALESCE(i.hours,0) > 0
  AND NOT EXISTS (SELECT 1 FROM public.student_ledger sl WHERE sl.invoice_id = i.id AND sl.entry_type='purchase');

-- Session completions
INSERT INTO public.student_ledger (student_id, entry_type, hours_delta, session_id, notes, created_at)
SELECT s.student_id, 'session_deducted', -(COALESCE(s.duration_minutes,60)::numeric/60.0), s.id, 'Backfill: completed', s.updated_at
FROM public.sessions s
WHERE s.status = 'completed'
  AND NOT EXISTS (SELECT 1 FROM public.student_ledger sl WHERE sl.session_id = s.id AND sl.entry_type='session_deducted');

INSERT INTO public.teacher_ledger (teacher_id, entry_type, minutes, amount, session_id, payroll_month, notes, created_at)
SELECT s.teacher_id, 'session_paid', COALESCE(s.duration_minutes,60),
       ROUND((COALESCE(t.hourly_rate,0) * (COALESCE(s.duration_minutes,60)::numeric/60.0))::numeric,2),
       s.id, date_trunc('month', s.session_date)::date, 'Backfill: completed', s.updated_at
FROM public.sessions s JOIN public.teachers t ON t.id = s.teacher_id
WHERE s.status = 'completed'
  AND NOT EXISTS (SELECT 1 FROM public.teacher_ledger tl WHERE tl.session_id = s.id AND tl.entry_type='session_paid');

-- Absences
INSERT INTO public.student_ledger (student_id, entry_type, hours_delta, session_id, notes, created_at)
SELECT s.student_id, 'absence_charged', -(COALESCE(s.duration_minutes,60)::numeric/60.0), s.id, 'Backfill: absence', s.updated_at
FROM public.sessions s
WHERE s.status = 'absent_student'
  AND NOT EXISTS (SELECT 1 FROM public.student_ledger sl WHERE sl.session_id = s.id AND sl.entry_type='absence_charged');

INSERT INTO public.teacher_ledger (teacher_id, entry_type, minutes, amount, session_id, payroll_month, notes, created_at)
SELECT s.teacher_id, 'absence_paid_15min', 15, ROUND((COALESCE(t.hourly_rate,0) * 0.25)::numeric,2),
       s.id, date_trunc('month', s.session_date)::date, 'Backfill: absence', s.updated_at
FROM public.sessions s JOIN public.teachers t ON t.id = s.teacher_id
WHERE s.status = 'absent_student'
  AND NOT EXISTS (SELECT 1 FROM public.teacher_ledger tl WHERE tl.session_id = s.id AND tl.entry_type='absence_paid_15min');

-- Recalc all balances & statuses
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.students LOOP
    PERFORM public.recalc_student_balance(r.id);
    PERFORM public.recalc_subscription_status(r.id);
  END LOOP;
END $$;
