UPDATE public.external_sync_events
SET status = 'processed',
    processed_at = now(),
    last_error = 'auto-skipped: target auth.users row missing (FK violation, will never succeed without manual user provisioning on target)',
    updated_at = now()
WHERE status = 'failed'
  AND last_error LIKE '%violates foreign key constraint%';