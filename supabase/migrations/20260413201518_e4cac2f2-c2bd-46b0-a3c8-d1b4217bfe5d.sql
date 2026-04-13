DROP POLICY IF EXISTS "Anyone can insert trial_bookings" ON public.trial_bookings;
CREATE POLICY "Anyone can insert trial_bookings"
ON public.trial_bookings
FOR INSERT
TO public
WITH CHECK (
  status = 'new'
  AND is_read = false
  AND admin_notes IS NULL
);

DROP POLICY IF EXISTS "Anyone can insert subscription_requests" ON public.subscription_requests;
CREATE POLICY "Anyone can insert subscription_requests"
ON public.subscription_requests
FOR INSERT
TO public
WITH CHECK (
  status = 'new'
  AND is_read = false
  AND admin_notes IS NULL
);