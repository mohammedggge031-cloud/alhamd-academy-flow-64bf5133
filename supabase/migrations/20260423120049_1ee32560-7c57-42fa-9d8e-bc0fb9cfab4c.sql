CREATE OR REPLACE FUNCTION public.prevent_teacher_financial_self_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Allow system / trigger context (auth.uid() is null) and admins/managers
  IF auth.uid() IS NULL
     OR has_role(auth.uid(), 'admin')
     OR has_role(auth.uid(), 'manager') THEN
    RETURN NEW;
  END IF;

  -- Teacher updating own row: revert protected financial fields
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

-- Allow Teacher to create the missing approval type
ALTER TABLE public.approval_requests DROP CONSTRAINT IF EXISTS approval_requests_request_type_check;
ALTER TABLE public.approval_requests ADD CONSTRAINT approval_requests_request_type_check
  CHECK (request_type IN ('reschedule','transfer','join_postponed','edit_schedule','postponed_to_completed'));