-- Clear all remaining failed sync events with FK violations or stale references
DELETE FROM public.external_sync_events
WHERE status = 'failed' AND (
  last_error::text ~ 'is not present in table'
  OR last_error::text ~ 'foreign key constraint'
  OR attempts >= 5
);