CREATE TABLE IF NOT EXISTS public.external_sync_config (
  id boolean PRIMARY KEY DEFAULT true,
  function_url text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  secret_value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT external_sync_config_singleton CHECK (id = true)
);

CREATE TABLE IF NOT EXISTS public.external_sync_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  operation text NOT NULL,
  record_id uuid,
  payload jsonb,
  old_payload jsonb,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_external_sync_events_status_created_at
ON public.external_sync_events (status, created_at);

CREATE INDEX IF NOT EXISTS idx_external_sync_events_table_record
ON public.external_sync_events (table_name, record_id);

ALTER TABLE public.external_sync_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_sync_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage external sync config" ON public.external_sync_config;
CREATE POLICY "Admins can manage external sync config"
ON public.external_sync_config
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can review external sync events" ON public.external_sync_events;
CREATE POLICY "Admins can review external sync events"
ON public.external_sync_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_external_sync_config(_function_url text, _secret_value text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.external_sync_config (id, function_url, secret_value, enabled, updated_at)
  VALUES (true, _function_url, _secret_value, true, now())
  ON CONFLICT (id)
  DO UPDATE SET
    function_url = EXCLUDED.function_url,
    secret_value = EXCLUDED.secret_value,
    enabled = true,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.request_external_sync_processing()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _function_url text;
  _secret_value text;
BEGIN
  SELECT function_url, secret_value
    INTO _function_url, _secret_value
  FROM public.external_sync_config
  WHERE id = true AND enabled = true;

  IF _function_url IS NULL OR _secret_value IS NULL THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := _function_url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('secret_key', _secret_value, 'mode', 'process_queue')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_external_sync_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _table_name text := TG_TABLE_NAME;
  _record_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _record_id := OLD.id;
    INSERT INTO public.external_sync_events (table_name, operation, record_id, old_payload)
    VALUES (_table_name, lower(TG_OP), _record_id, to_jsonb(OLD));
  ELSE
    _record_id := NEW.id;
    INSERT INTO public.external_sync_events (table_name, operation, record_id, payload, old_payload)
    VALUES (_table_name, lower(TG_OP), _record_id, to_jsonb(NEW), CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END);
  END IF;

  PERFORM public.request_external_sync_processing();

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_external_sync_event_result(
  _event_id uuid,
  _status text,
  _last_error text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.external_sync_events
  SET status = _status,
      attempts = attempts + 1,
      last_error = _last_error,
      processed_at = CASE WHEN _status = 'processed' THEN now() ELSE processed_at END,
      updated_at = now()
  WHERE id = _event_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_external_sync_event(_event_id uuid, _last_error text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.external_sync_events
  SET status = 'pending',
      attempts = attempts + 1,
      last_error = _last_error,
      updated_at = now()
  WHERE id = _event_id;
END;
$$;

DROP TRIGGER IF EXISTS update_external_sync_config_updated_at ON public.external_sync_config;
CREATE TRIGGER update_external_sync_config_updated_at
BEFORE UPDATE ON public.external_sync_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_external_sync_events_updated_at ON public.external_sync_events;
CREATE TRIGGER update_external_sync_events_updated_at
BEFORE UPDATE ON public.external_sync_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS sync_profiles_changes ON public.profiles;
CREATE TRIGGER sync_profiles_changes AFTER INSERT OR UPDATE OR DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.enqueue_external_sync_event();
DROP TRIGGER IF EXISTS sync_user_roles_changes ON public.user_roles;
CREATE TRIGGER sync_user_roles_changes AFTER INSERT OR UPDATE OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.enqueue_external_sync_event();
DROP TRIGGER IF EXISTS sync_teachers_changes ON public.teachers;
CREATE TRIGGER sync_teachers_changes AFTER INSERT OR UPDATE OR DELETE ON public.teachers FOR EACH ROW EXECUTE FUNCTION public.enqueue_external_sync_event();
DROP TRIGGER IF EXISTS sync_students_changes ON public.students;
CREATE TRIGGER sync_students_changes AFTER INSERT OR UPDATE OR DELETE ON public.students FOR EACH ROW EXECUTE FUNCTION public.enqueue_external_sync_event();
DROP TRIGGER IF EXISTS sync_sessions_changes ON public.sessions;
CREATE TRIGGER sync_sessions_changes AFTER INSERT OR UPDATE OR DELETE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.enqueue_external_sync_event();
DROP TRIGGER IF EXISTS sync_approval_requests_changes ON public.approval_requests;
CREATE TRIGGER sync_approval_requests_changes AFTER INSERT OR UPDATE OR DELETE ON public.approval_requests FOR EACH ROW EXECUTE FUNCTION public.enqueue_external_sync_event();
DROP TRIGGER IF EXISTS sync_session_reports_changes ON public.session_reports;
CREATE TRIGGER sync_session_reports_changes AFTER INSERT OR UPDATE OR DELETE ON public.session_reports FOR EACH ROW EXECUTE FUNCTION public.enqueue_external_sync_event();
DROP TRIGGER IF EXISTS sync_monthly_reports_changes ON public.monthly_reports;
CREATE TRIGGER sync_monthly_reports_changes AFTER INSERT OR UPDATE OR DELETE ON public.monthly_reports FOR EACH ROW EXECUTE FUNCTION public.enqueue_external_sync_event();
DROP TRIGGER IF EXISTS sync_invoices_changes ON public.invoices;
CREATE TRIGGER sync_invoices_changes AFTER INSERT OR UPDATE OR DELETE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.enqueue_external_sync_event();
DROP TRIGGER IF EXISTS sync_invoice_students_changes ON public.invoice_students;
CREATE TRIGGER sync_invoice_students_changes AFTER INSERT OR UPDATE OR DELETE ON public.invoice_students FOR EACH ROW EXECUTE FUNCTION public.enqueue_external_sync_event();
DROP TRIGGER IF EXISTS sync_expenses_changes ON public.expenses;
CREATE TRIGGER sync_expenses_changes AFTER INSERT OR UPDATE OR DELETE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.enqueue_external_sync_event();
DROP TRIGGER IF EXISTS sync_teacher_documents_changes ON public.teacher_documents;
CREATE TRIGGER sync_teacher_documents_changes AFTER INSERT OR UPDATE OR DELETE ON public.teacher_documents FOR EACH ROW EXECUTE FUNCTION public.enqueue_external_sync_event();
DROP TRIGGER IF EXISTS sync_trial_bookings_changes ON public.trial_bookings;
CREATE TRIGGER sync_trial_bookings_changes AFTER INSERT OR UPDATE OR DELETE ON public.trial_bookings FOR EACH ROW EXECUTE FUNCTION public.enqueue_external_sync_event();
DROP TRIGGER IF EXISTS sync_subscription_requests_changes ON public.subscription_requests;
CREATE TRIGGER sync_subscription_requests_changes AFTER INSERT OR UPDATE OR DELETE ON public.subscription_requests FOR EACH ROW EXECUTE FUNCTION public.enqueue_external_sync_event();
DROP TRIGGER IF EXISTS sync_notifications_changes ON public.notifications;
CREATE TRIGGER sync_notifications_changes AFTER INSERT OR UPDATE OR DELETE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.enqueue_external_sync_event();
DROP TRIGGER IF EXISTS sync_regulations_changes ON public.regulations;
CREATE TRIGGER sync_regulations_changes AFTER INSERT OR UPDATE OR DELETE ON public.regulations FOR EACH ROW EXECUTE FUNCTION public.enqueue_external_sync_event();
DROP TRIGGER IF EXISTS sync_academy_settings_changes ON public.academy_settings;
CREATE TRIGGER sync_academy_settings_changes AFTER INSERT OR UPDATE OR DELETE ON public.academy_settings FOR EACH ROW EXECUTE FUNCTION public.enqueue_external_sync_event();

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'external-sync-retry';

SELECT cron.schedule(
  'external-sync-retry',
  '* * * * *',
  $$SELECT public.request_external_sync_processing();$$
);
