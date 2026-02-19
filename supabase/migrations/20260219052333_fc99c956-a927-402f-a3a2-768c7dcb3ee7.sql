
CREATE OR REPLACE FUNCTION public.handle_session_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Prevent changing from absent_student to postponed or vice versa
  IF (OLD.status = 'absent_student' AND NEW.status = 'postponed')
     OR (OLD.status = 'postponed' AND NEW.status = 'absent_student') THEN
    RAISE EXCEPTION 'لا يمكن تأجيل حصة مسجلة غياب أو تسجيل غياب لحصة مؤجلة';
  END IF;

  -- Student absent: teacher gets 15 min only, student charged full duration
  IF NEW.status = 'absent_student' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.waiting_minutes := 15;
    NEW.teacher_paid := true;  -- paid for 15 min waiting only
  END IF;

  -- Postponed: don't pay teacher until student joins
  IF NEW.status = 'postponed' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.teacher_paid := false;
  END IF;

  -- Postponed -> completed: student joined, pay teacher full duration
  IF NEW.status = 'completed' AND OLD.status = 'postponed' THEN
    NEW.teacher_paid := true;
  END IF;

  RETURN NEW;
END;
$function$;
