
-- 1) Decrement student remaining_hours when a session is created
CREATE OR REPLACE FUNCTION public.decrement_student_hours_on_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('postponed','cancelled') THEN
    RETURN NEW;
  END IF;
  UPDATE public.students
     SET remaining_hours = COALESCE(remaining_hours,0) - (COALESCE(NEW.duration_minutes,60)::numeric / 60.0),
         updated_at = now()
   WHERE id = NEW.student_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sessions_decrement_hours ON public.sessions;
CREATE TRIGGER trg_sessions_decrement_hours
AFTER INSERT ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.decrement_student_hours_on_session();

-- 2) Credit student when invoice transitions to paid
CREATE OR REPLACE FUNCTION public.credit_student_on_invoice_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _hours numeric := 0;
BEGIN
  IF NEW.status = 'paid'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'paid')
     AND NEW.student_id IS NOT NULL THEN
    _hours := COALESCE(NEW.hours, 0);
    IF _hours > 0 THEN
      UPDATE public.students
         SET paid_hours = COALESCE(paid_hours,0) + _hours,
             remaining_hours = COALESCE(remaining_hours,0) + _hours,
             updated_at = now()
       WHERE id = NEW.student_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoices_credit_hours ON public.invoices;
CREATE TRIGGER trg_invoices_credit_hours
AFTER INSERT OR UPDATE OF status, hours ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.credit_student_on_invoice_paid();
