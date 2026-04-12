
-- 1. Remove duplicate triggers on sessions table
DROP TRIGGER IF EXISTS session_status_change ON public.sessions;
DROP TRIGGER IF EXISTS update_sessions_updated_at ON public.sessions;

-- 2. Remove duplicate updated_at triggers on subscription_requests and trial_bookings
DROP TRIGGER IF EXISTS update_subscription_requests_updated_at ON public.subscription_requests;
DROP TRIGGER IF EXISTS update_trial_bookings_updated_at ON public.trial_bookings;

-- 3. Create a restricted view for managers to access teachers WITHOUT financial data
CREATE OR REPLACE VIEW public.teachers_manager_view AS
SELECT 
  id, user_id, age, qualification, zoom_link, is_active, created_at, updated_at,
  students_count, rating, subjects, gender, profile_completed, bio, ijazat, academic_degree,
  show_on_website, website_visible_fields, rate_currency
FROM public.teachers;

-- Grant access
GRANT SELECT ON public.teachers_manager_view TO authenticated;

-- 4. Add RLS policy comments for documentation (no-op but useful)
COMMENT ON POLICY "Anyone can insert trial_bookings" ON public.trial_bookings IS 'Public form - protected by enforce_trial_booking_defaults trigger';
COMMENT ON POLICY "Anyone can insert subscription_requests" ON public.subscription_requests IS 'Public form - protected by enforce_subscription_request_defaults trigger';
