
-- Step 1: Update request_external_sync_processing to hardcode the public anon key
CREATE OR REPLACE FUNCTION public.request_external_sync_processing()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _function_url text;
  -- Public anon key (same as frontend VITE_SUPABASE_PUBLISHABLE_KEY, not a secret)
  _anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhveW1sbHlmd3ZibmJ4c2JiaW51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NjY5NTAsImV4cCI6MjA4NzA0Mjk1MH0.VtVtZLEAj6jc3hVDISLHsux2dvbCOPZ5HRPZwC0Hc-A';
BEGIN
  SELECT function_url
    INTO _function_url
  FROM public.external_sync_config
  WHERE id = true AND enabled = true;

  IF _function_url IS NULL THEN
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
      'internal_token', _anon_key
    )
  );
END;
$$;

-- Step 2: Simplify set_external_sync_config (no more auth_token)
DROP FUNCTION IF EXISTS public.set_external_sync_config(text, text);

CREATE OR REPLACE FUNCTION public.set_external_sync_config(_function_url text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.external_sync_config (id, function_url, enabled, updated_at)
  VALUES (true, _function_url, true, now())
  ON CONFLICT (id)
  DO UPDATE SET
    function_url = EXCLUDED.function_url,
    enabled = true,
    updated_at = now();
END;
$$;

-- Step 3: Drop the secret_value column
ALTER TABLE public.external_sync_config DROP COLUMN IF EXISTS secret_value;
