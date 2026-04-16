
-- Prevent teachers from modifying their own financial fields via a validation trigger
CREATE OR REPLACE FUNCTION public.prevent_teacher_financial_self_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') AND NOT has_role(auth.uid(), 'manager') THEN
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
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_teacher_financial_self_edit
  BEFORE UPDATE ON public.teachers
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_teacher_financial_self_edit();
