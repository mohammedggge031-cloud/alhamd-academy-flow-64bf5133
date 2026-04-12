-- Remove sessions table from Realtime publication to prevent unauthorized channel subscriptions
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.sessions;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END;
$$;