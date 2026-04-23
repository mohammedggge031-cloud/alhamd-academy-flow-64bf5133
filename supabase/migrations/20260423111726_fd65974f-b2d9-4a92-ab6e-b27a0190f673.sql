-- Function: recalculate a single teacher's monthly stats from real sessions
CREATE OR REPLACE FUNCTION public.recalc_teacher_monthly_stats(_teacher_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _completed_minutes integer := 0;
  _waiting_minutes integer := 0;
  _absence_hours numeric := 0;
  _hourly_rate numeric := 0;
  _hours numeric := 0;
  _salary numeric := 0;
BEGIN
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
  -- Salary = hourly_rate * (completed_hours + waiting_minutes/60)
  _salary := ROUND((_hourly_rate * (_hours + (_waiting_minutes::numeric / 60.0)))::numeric, 2);

  UPDATE public.teachers
  SET monthly_hours = _hours,
      monthly_waiting_minutes = _waiting_minutes,
      monthly_absence_hours = ROUND(_absence_hours::numeric, 2),
      monthly_salary = _salary,
      updated_at = now()
  WHERE id = _teacher_id;
END;
$$;

-- Trigger function on sessions changes
CREATE OR REPLACE FUNCTION public.trg_sessions_recalc_teacher()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_teacher_monthly_stats(OLD.teacher_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.recalc_teacher_monthly_stats(NEW.teacher_id);
    IF OLD.teacher_id IS DISTINCT FROM NEW.teacher_id THEN
      PERFORM public.recalc_teacher_monthly_stats(OLD.teacher_id);
    END IF;
    RETURN NEW;
  ELSE
    PERFORM public.recalc_teacher_monthly_stats(NEW.teacher_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS sessions_recalc_teacher_stats ON public.sessions;
CREATE TRIGGER sessions_recalc_teacher_stats
AFTER INSERT OR UPDATE OR DELETE ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.trg_sessions_recalc_teacher();

-- Backfill: recalc for all existing teachers
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.teachers LOOP
    PERFORM public.recalc_teacher_monthly_stats(r.id);
  END LOOP;
END $$;