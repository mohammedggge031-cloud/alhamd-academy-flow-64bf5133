
CREATE POLICY "Manager delete trial_bookings" ON public.trial_bookings
FOR DELETE TO public
USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Manager delete subscription_requests" ON public.subscription_requests
FOR DELETE TO public
USING (has_role(auth.uid(), 'manager'::app_role));
