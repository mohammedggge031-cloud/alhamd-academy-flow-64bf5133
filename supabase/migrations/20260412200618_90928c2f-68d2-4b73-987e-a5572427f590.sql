
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.trial_bookings; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.subscription_requests; EXCEPTION WHEN OTHERS THEN NULL; END;
END;
$$;
