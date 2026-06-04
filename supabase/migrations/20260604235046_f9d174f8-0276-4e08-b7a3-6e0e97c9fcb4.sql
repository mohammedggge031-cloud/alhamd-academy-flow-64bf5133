
-- Revoke EXECUTE from PUBLIC/anon/authenticated on internal SECURITY DEFINER functions
-- These run as triggers or are called by other security definer functions only.

REVOKE EXECUTE ON FUNCTION public.enqueue_external_sync_event() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.request_external_sync_processing() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_external_sync_config(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_external_sync_events(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_external_sync_event_result(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_external_sync_event(uuid, text) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrement_student_hours_on_session() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.credit_student_on_invoice_paid() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_teacher_financial_self_edit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_teacher_monthly_stats(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_sessions_recalc_teacher() FROM PUBLIC, anon, authenticated;

-- has_role, mark_all_notifications_read, mark_notification_group_read remain
-- executable by authenticated users since the app calls them directly.
