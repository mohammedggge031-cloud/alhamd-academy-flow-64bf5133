
-- Manager can create monthly reports (like teachers)
CREATE POLICY "Manager create monthly_reports"
ON public.monthly_reports
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

-- Manager can update monthly reports
CREATE POLICY "Manager update monthly_reports"
ON public.monthly_reports
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));

-- Manager can create session reports (like teachers)
CREATE POLICY "Manager create session_reports"
ON public.session_reports
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

-- Manager can update session reports
CREATE POLICY "Manager update session_reports"
ON public.session_reports
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));
