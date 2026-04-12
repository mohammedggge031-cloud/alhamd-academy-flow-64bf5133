-- Re-create updated_at triggers for all tables that have updated_at column
DO $$ 
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'profiles','teachers','students','sessions','invoices','expenses',
    'monthly_reports','approval_requests','trial_bookings',
    'subscription_requests','regulations','academy_settings'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_updated_at ON public.%I', tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at()',
      tbl
    );
  END LOOP;
END $$;

-- Re-create handle_new_user trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Re-create session status change trigger
DROP TRIGGER IF EXISTS trg_session_status ON public.sessions;
CREATE TRIGGER trg_session_status
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_session_status_change();
