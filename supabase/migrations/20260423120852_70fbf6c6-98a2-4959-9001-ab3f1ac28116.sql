-- Mark internal recalc context so prevent_teacher_financial_self_edit allows it
CREATE OR REPLACE FUNCTION public.recalc_teacher_monthly_stats(_teacher_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _completed_minutes integer := 0;
  _waiting_minutes integer := 0;
  _absence_hours numeric := 0;
  _hourly_rate numeric := 0;
  _hours numeric := 0;
  _salary numeric := 0;
BEGIN
  PERFORM set_config('app.recalc_internal','1', true);

  SELECT
    COALESCE(SUM(CASE WHEN status = 'completed' THEN duration_minutes ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'absent_student' THEN COALESCE(waiting_minutes,0) + COALESCE(exception_minutes,0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'absent_student' THEN duration_minutes ELSE 0 END), 0) / 60.0
  INTO _completed_minutes, _waiting_minutes, _absence_hours
  FROM public.sessions
  WHERE teacher_id = _teacher_id
    AND session_date >= date_trunc('month', CURRENT_DATE)::date
    AND session_date < (date_trunc('month', CURRENT_DATE) + interval '1 month')::date;

  SELECT hourly_rate INTO _hourly_rate FROM public.teachers WHERE id = _teacher_id;

  _hours := ROUND((_completed_minutes::numeric / 60.0)::numeric, 2);
  _salary := ROUND((_hourly_rate * (_hours + (_waiting_minutes::numeric / 60.0)))::numeric, 2);

  UPDATE public.teachers
  SET monthly_hours = _hours,
      monthly_waiting_minutes = _waiting_minutes,
      monthly_absence_hours = ROUND(_absence_hours::numeric, 2),
      monthly_salary = _salary,
      updated_at = now()
  WHERE id = _teacher_id;

  PERFORM set_config('app.recalc_internal','0', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_teacher_financial_self_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Allow internal recalc, system context, and admins/managers
  IF current_setting('app.recalc_internal', true) = '1'
     OR auth.uid() IS NULL
     OR has_role(auth.uid(), 'admin')
     OR has_role(auth.uid(), 'manager') THEN
    RETURN NEW;
  END IF;

  NEW.hourly_rate := OLD.hourly_rate;
  NEW.bonus_amount := OLD.bonus_amount;
  NEW.bonus_reason := OLD.bonus_reason;
  NEW.monthly_salary := OLD.monthly_salary;
  NEW.monthly_hours := OLD.monthly_hours;
  NEW.monthly_waiting_minutes := OLD.monthly_waiting_minutes;
  NEW.monthly_absence_hours := OLD.monthly_absence_hours;
  NEW.rate_currency := OLD.rate_currency;
  NEW.students_count := OLD.students_count;
  NEW.rating := OLD.rating;
  NEW.show_on_website := OLD.show_on_website;
  NEW.website_visible_fields := OLD.website_visible_fields;
  NEW.is_active := OLD.is_active;
  RETURN NEW;
END;
$$;