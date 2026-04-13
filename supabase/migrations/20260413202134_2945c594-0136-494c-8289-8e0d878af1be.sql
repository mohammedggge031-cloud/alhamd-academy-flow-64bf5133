CREATE OR REPLACE FUNCTION public.claim_external_sync_events(_limit integer DEFAULT 50)
RETURNS SETOF public.external_sync_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT e.id
    FROM public.external_sync_events e
    WHERE e.status = 'pending'
       OR (
         e.status = 'failed'
         AND e.attempts < 20
         AND e.updated_at <= now() - make_interval(secs => LEAST(GREATEST(e.attempts, 1) * 30, 600))
       )
       OR (
         e.status = 'processing'
         AND e.updated_at <= now() - interval '2 minutes'
       )
    ORDER BY e.created_at
    LIMIT GREATEST(_limit, 1)
    FOR UPDATE SKIP LOCKED
  ),
  claimed AS (
    UPDATE public.external_sync_events e
    SET status = 'processing',
        updated_at = now()
    FROM candidates c
    WHERE e.id = c.id
    RETURNING e.*
  )
  SELECT * FROM claimed;
END;
$$;