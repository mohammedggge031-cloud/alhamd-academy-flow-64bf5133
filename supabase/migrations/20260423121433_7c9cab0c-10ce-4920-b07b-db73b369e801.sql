-- Purge all remaining unfixable failed events
DELETE FROM public.external_sync_events
WHERE status = 'failed'
  AND (
    -- references to deleted auth users
    (last_error::text LIKE '%is not present in table "users"%')
    -- missing column on prod DB (will need separate prod schema fix)
    OR (last_error::text LIKE '%communication_language%')
    -- references to deleted records
    OR (last_error::text LIKE '%is not present in table "sessions"%')
    OR (last_error::text LIKE '%is not present in table "teachers"%')
    -- check constraint that was already fixed
    OR (last_error::text LIKE '%23514%')
  );