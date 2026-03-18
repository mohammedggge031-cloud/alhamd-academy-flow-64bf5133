
-- Fix overly permissive INSERT policy on notifications
DROP POLICY "Service insert notifications" ON public.notifications;

-- Only admin and manager can insert notifications via client
CREATE POLICY "Admin manager insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
);
