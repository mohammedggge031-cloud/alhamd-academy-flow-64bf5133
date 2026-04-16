
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

  -- Send both apikey (for gateway routing) and Authorization (for function auth)
  PERFORM net.http_post(
    url := _function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', COALESCE(_auth_token, ''),
      'Authorization', 'Bearer ' || COALESCE(_auth_token, '')
    ),
    body := jsonb_build_object(
      'mode', 'process_queue'
    )
  );
END;
$$;
