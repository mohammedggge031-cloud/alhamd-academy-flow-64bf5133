
-- Drop old function signature
DROP FUNCTION IF EXISTS public.set_external_sync_config(text, text);

-- Recreate with auth_token parameter
CREATE OR REPLACE FUNCTION public.set_external_sync_config(_function_url text, _auth_token text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.external_sync_config (id, function_url, secret_value, enabled, updated_at)
  VALUES (true, _function_url, _auth_token, true, now())
  ON CONFLICT (id)
  DO UPDATE SET
    function_url = EXCLUDED.function_url,
    secret_value = EXCLUDED.secret_value,
    enabled = true,
    updated_at = now();
END;
$$;

-- Update trigger function to use Authorization header instead of secret in body
CREATE OR REPLACE FUNCTION public.request_external_sync_processing()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _function_url text;
  _auth_token text;
BEGIN
  SELECT function_url, secret_value
    INTO _function_url, _auth_token
  FROM public.external_sync_config
  WHERE id = true AND enabled = true;

  IF _function_url IS NULL THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := _function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(_auth_token, '')
    ),
    body := jsonb_build_object(
      'mode', 'process_queue'
    )
  );
END;
$$;

-- Replace the stored secret with the public anon key (already public in frontend)
UPDATE public.external_sync_config
SET secret_value = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhveW1sbHlmd3ZibmJ4c2JiaW51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NjY5NTAsImV4cCI6MjA4NzA0Mjk1MH0.VtVtZLEAj6jc3hVDISLHsux2dvbCOPZ5HRPZwC0Hc-A',
    updated_at = now()
WHERE id = true;
