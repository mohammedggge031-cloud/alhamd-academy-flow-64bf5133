
-- Create expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('advertising', 'admin_salary', 'other')),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  expense_month DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access expenses"
  ON public.expenses FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Manager policies on existing tables
CREATE POLICY "Manager read students" ON public.students FOR SELECT USING (has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Manager write students" ON public.students FOR INSERT WITH CHECK (has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Manager update students" ON public.students FOR UPDATE USING (has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Manager delete students" ON public.students FOR DELETE USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Manager read teachers" ON public.teachers FOR SELECT USING (has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Manager update teachers" ON public.teachers FOR UPDATE USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Manager read sessions" ON public.sessions FOR SELECT USING (has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Manager write sessions" ON public.sessions FOR INSERT WITH CHECK (has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Manager update sessions" ON public.sessions FOR UPDATE USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Manager read invoices" ON public.invoices FOR SELECT USING (has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Manager write invoices" ON public.invoices FOR INSERT WITH CHECK (has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Manager update invoices" ON public.invoices FOR UPDATE USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Manager read invoice_students" ON public.invoice_students FOR SELECT USING (has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Manager write invoice_students" ON public.invoice_students FOR INSERT WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Manager read profiles" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Manager read session_reports" ON public.session_reports FOR SELECT USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Manager read monthly_reports" ON public.monthly_reports FOR SELECT USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Manager read approval_requests" ON public.approval_requests FOR SELECT USING (has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Manager update approval_requests" ON public.approval_requests FOR UPDATE USING (has_role(auth.uid(), 'manager'::app_role));

-- Manager can also manage user_roles? No - only admin should
-- Manager can read own role
