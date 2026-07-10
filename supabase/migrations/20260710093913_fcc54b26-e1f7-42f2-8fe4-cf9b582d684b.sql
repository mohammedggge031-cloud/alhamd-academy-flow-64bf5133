
-- Revoke EXECUTE from anon/public on SECURITY DEFINER functions not intended for anonymous callers
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_parent_of(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_all_notifications_read(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_notification_group_read(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_audit(text, text, uuid, jsonb, jsonb, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recalc_teacher_monthly_stats(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_external_sync_events(integer) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.request_external_sync_processing() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_external_sync_config(text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_external_sync_config(text, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.touch_external_sync_event(uuid, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_external_sync_event_result(uuid, text, text) FROM anon, PUBLIC;

-- Grant back to authenticated where needed by app code
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_parent_of(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_group_read(uuid) TO authenticated;
