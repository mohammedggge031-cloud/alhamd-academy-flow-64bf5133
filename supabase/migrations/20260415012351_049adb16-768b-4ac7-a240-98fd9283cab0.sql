-- Fix teachers policies: change from public to authenticated
DROP POLICY IF EXISTS "Manager read teachers" ON public.teachers;
CREATE POLICY "Manager read teachers" ON public.teachers FOR SELECT TO authenticated USING (has_role(auth.uid(), 'manager'::app_role));

DROP POLICY IF EXISTS "Manager update teachers" ON public.teachers;
CREATE POLICY "Manager update teachers" ON public.teachers FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'manager'::app_role));

DROP POLICY IF EXISTS "Teacher can update own profile" ON public.teachers;
CREATE POLICY "Teacher can update own profile" ON public.teachers FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Fix students policies
DROP POLICY IF EXISTS "Manager read students" ON public.students;
CREATE POLICY "Manager read students" ON public.students FOR SELECT TO authenticated USING (has_role(auth.uid(), 'manager'::app_role));

DROP POLICY IF EXISTS "Manager update students" ON public.students;
CREATE POLICY "Manager update students" ON public.students FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'manager'::app_role));

DROP POLICY IF EXISTS "Manager write students" ON public.students;
CREATE POLICY "Manager write students" ON public.students FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

DROP POLICY IF EXISTS "Manager delete students" ON public.students;
CREATE POLICY "Manager delete students" ON public.students FOR DELETE TO authenticated USING (has_role(auth.uid(), 'manager'::app_role));

-- Fix invoices policies
DROP POLICY IF EXISTS "Manager read invoices" ON public.invoices;
CREATE POLICY "Manager read invoices" ON public.invoices FOR SELECT TO authenticated USING (has_role(auth.uid(), 'manager'::app_role));

DROP POLICY IF EXISTS "Manager update invoices" ON public.invoices;
CREATE POLICY "Manager update invoices" ON public.invoices FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'manager'::app_role));

DROP POLICY IF EXISTS "Manager write invoices" ON public.invoices;
CREATE POLICY "Manager write invoices" ON public.invoices FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

-- Fix expenses policies
DROP POLICY IF EXISTS "Admin full access expenses" ON public.expenses;
CREATE POLICY "Admin full access expenses" ON public.expenses FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix invoice_students policies
DROP POLICY IF EXISTS "Admin full access invoice_students" ON public.invoice_students;
CREATE POLICY "Admin full access invoice_students" ON public.invoice_students FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Manager read invoice_students" ON public.invoice_students;
CREATE POLICY "Manager read invoice_students" ON public.invoice_students FOR SELECT TO authenticated USING (has_role(auth.uid(), 'manager'::app_role));

DROP POLICY IF EXISTS "Manager write invoice_students" ON public.invoice_students;
CREATE POLICY "Manager write invoice_students" ON public.invoice_students FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

-- Fix session_reports policies
DROP POLICY IF EXISTS "Manager read session_reports" ON public.session_reports;
CREATE POLICY "Manager read session_reports" ON public.session_reports FOR SELECT TO authenticated USING (has_role(auth.uid(), 'manager'::app_role));

-- Fix monthly_reports policies
DROP POLICY IF EXISTS "Admin full access monthly_reports" ON public.monthly_reports;
CREATE POLICY "Admin full access monthly_reports" ON public.monthly_reports FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Manager read monthly_reports" ON public.monthly_reports;
CREATE POLICY "Manager read monthly_reports" ON public.monthly_reports FOR SELECT TO authenticated USING (has_role(auth.uid(), 'manager'::app_role));

DROP POLICY IF EXISTS "Teacher can view own reports" ON public.monthly_reports;
CREATE POLICY "Teacher can view own reports" ON public.monthly_reports FOR SELECT TO authenticated USING (teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Teacher can create own reports" ON public.monthly_reports;
CREATE POLICY "Teacher can create own reports" ON public.monthly_reports FOR INSERT TO authenticated WITH CHECK (teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Teacher can update own reports" ON public.monthly_reports;
CREATE POLICY "Teacher can update own reports" ON public.monthly_reports FOR UPDATE TO authenticated USING (teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()));

-- Fix subscription_requests policies
DROP POLICY IF EXISTS "Admin full access subscription_requests" ON public.subscription_requests;
CREATE POLICY "Admin full access subscription_requests" ON public.subscription_requests FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Manager read subscription_requests" ON public.subscription_requests;
CREATE POLICY "Manager read subscription_requests" ON public.subscription_requests FOR SELECT TO authenticated USING (has_role(auth.uid(), 'manager'::app_role));

DROP POLICY IF EXISTS "Manager update subscription_requests" ON public.subscription_requests;
CREATE POLICY "Manager update subscription_requests" ON public.subscription_requests FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'manager'::app_role));

DROP POLICY IF EXISTS "Manager delete subscription_requests" ON public.subscription_requests;
CREATE POLICY "Manager delete subscription_requests" ON public.subscription_requests FOR DELETE TO authenticated USING (has_role(auth.uid(), 'manager'::app_role));

-- Fix trial_bookings policies
DROP POLICY IF EXISTS "Admin full access trial_bookings" ON public.trial_bookings;
CREATE POLICY "Admin full access trial_bookings" ON public.trial_bookings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Manager read trial_bookings" ON public.trial_bookings;
CREATE POLICY "Manager read trial_bookings" ON public.trial_bookings FOR SELECT TO authenticated USING (has_role(auth.uid(), 'manager'::app_role));

DROP POLICY IF EXISTS "Manager update trial_bookings" ON public.trial_bookings;
CREATE POLICY "Manager update trial_bookings" ON public.trial_bookings FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'manager'::app_role));

DROP POLICY IF EXISTS "Manager delete trial_bookings" ON public.trial_bookings;
CREATE POLICY "Manager delete trial_bookings" ON public.trial_bookings FOR DELETE TO authenticated USING (has_role(auth.uid(), 'manager'::app_role));

-- Fix teacher_documents policies
DROP POLICY IF EXISTS "Admin full access teacher_documents" ON public.teacher_documents;
CREATE POLICY "Admin full access teacher_documents" ON public.teacher_documents FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Manager read teacher_documents" ON public.teacher_documents;
CREATE POLICY "Manager read teacher_documents" ON public.teacher_documents FOR SELECT TO authenticated USING (has_role(auth.uid(), 'manager'::app_role));

DROP POLICY IF EXISTS "Teacher manage own documents" ON public.teacher_documents;
CREATE POLICY "Teacher manage own documents" ON public.teacher_documents FOR ALL TO authenticated USING (teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())) WITH CHECK (teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()));

-- Fix approval_requests policies
DROP POLICY IF EXISTS "Manager read approval_requests" ON public.approval_requests;
CREATE POLICY "Manager read approval_requests" ON public.approval_requests FOR SELECT TO authenticated USING (has_role(auth.uid(), 'manager'::app_role));

DROP POLICY IF EXISTS "Manager update approval_requests" ON public.approval_requests;
CREATE POLICY "Manager update approval_requests" ON public.approval_requests FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'manager'::app_role));

-- Fix sessions policies
DROP POLICY IF EXISTS "Manager read sessions" ON public.sessions;
CREATE POLICY "Manager read sessions" ON public.sessions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'manager'::app_role));

DROP POLICY IF EXISTS "Manager update sessions" ON public.sessions;
CREATE POLICY "Manager update sessions" ON public.sessions FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'manager'::app_role));

DROP POLICY IF EXISTS "Manager write sessions" ON public.sessions;
CREATE POLICY "Manager write sessions" ON public.sessions FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

-- Fix profiles policies
DROP POLICY IF EXISTS "Manager read profiles" ON public.profiles;
CREATE POLICY "Manager read profiles" ON public.profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'manager'::app_role));