
-- Update request_external_sync_processing to use anon key in Authorization header
-- The edge function will validate this internally
CREATE OR REPLACE FUNCTION public.request_external_sync_processing()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _function_url text;
  _secret_value text;
BEGIN
  SELECT function_url, secret_value
    INTO _function_url, _secret_value
  FROM public.external_sync_config
  WHERE id = true AND enabled = true;

  IF _function_url IS NULL THEN
    RETURN;
  END IF;

  -- Pass secret_key in body for auth
  PERFORM net.http_post(
    url := _function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'secret_key', COALESCE(_secret_value, ''),
      'mode', 'process_queue'
    )
  );
END;
$$;
