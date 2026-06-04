
ALTER TABLE public.external_sync_config ADD COLUMN IF NOT EXISTS sync_secret text;

CREATE OR REPLACE FUNCTION public.set_external_sync_config(_function_url text, _sync_secret text DEFAULT NULL)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.external_sync_config (id, function_url, sync_secret, enabled, updated_at)
  VALUES (true, _function_url, _sync_secret, true, now())
  ON CONFLICT (id)
  DO UPDATE SET
    function_url = EXCLUDED.function_url,
    sync_secret = COALESCE(EXCLUDED.sync_secret, public.external_sync_config.sync_secret),
    enabled = true,
    updated_at = now();
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.set_external_sync_config(text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.request_external_sync_processing()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _function_url text;
  _sync_secret text;
  _anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhveW1sbHlmd3ZibmJ4c2JiaW51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NjY5NTAsImV4cCI6MjA4NzA0Mjk1MH0.VtVtZLEAj6jc3hVDISLHsux2dvbCOPZ5HRPZwC0Hc-A';
BEGIN
  SELECT function_url, sync_secret
    INTO _function_url, _sync_secret
  FROM public.external_sync_config
  WHERE id = true AND enabled = true;

  IF _function_url IS NULL OR _sync_secret IS NULL THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := _function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', _anon_key,
      'Authorization', 'Bearer ' || _anon_key
    ),
    body := jsonb_build_object(
      'mode', 'process_queue',
      'secret_key', _sync_secret
    )
  );
END;
$function$;
