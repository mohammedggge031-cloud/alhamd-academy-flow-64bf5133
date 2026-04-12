
-- 1. Remove sensitive tables from Realtime publication
-- Use DO block to handle tables that may not be in the publication
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.students; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.invoices; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.teachers; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications; EXCEPTION WHEN OTHERS THEN NULL; END;
END;
$$;

-- 2. Tighten public INSERT policies with validation triggers

-- Drop old permissive policies
DROP POLICY IF EXISTS "Anyone can insert trial_bookings" ON public.trial_bookings;
DROP POLICY IF EXISTS "Anyone can insert subscription_requests" ON public.subscription_requests;

-- Validation trigger for trial_bookings
CREATE OR REPLACE FUNCTION public.validate_trial_booking_insert()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.is_read := false;
  NEW.admin_notes := NULL;
  NEW.status := 'new';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_trial_booking_defaults ON public.trial_bookings;
CREATE TRIGGER enforce_trial_booking_defaults
  BEFORE INSERT ON public.trial_bookings
  FOR EACH ROW
  WHEN (NOT public.has_role(COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), 'admin') 
    AND NOT public.has_role(COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), 'manager'))
  EXECUTE FUNCTION public.validate_trial_booking_insert();

-- Validation trigger for subscription_requests
CREATE OR REPLACE FUNCTION public.validate_subscription_request_insert()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.is_read := false;
  NEW.admin_notes := NULL;
  NEW.status := 'new';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_subscription_request_defaults ON public.subscription_requests;
CREATE TRIGGER enforce_subscription_request_defaults
  BEFORE INSERT ON public.subscription_requests
  FOR EACH ROW
  WHEN (NOT public.has_role(COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), 'admin')
    AND NOT public.has_role(COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), 'manager'))
  EXECUTE FUNCTION public.validate_subscription_request_insert();

-- Re-add INSERT policies
CREATE POLICY "Anyone can insert trial_bookings" ON public.trial_bookings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert subscription_requests" ON public.subscription_requests
  FOR INSERT WITH CHECK (true);
