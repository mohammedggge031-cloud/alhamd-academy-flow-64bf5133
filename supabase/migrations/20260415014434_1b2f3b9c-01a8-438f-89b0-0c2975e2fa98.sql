
-- Remove manager access to invoices
DROP POLICY IF EXISTS "Manager read invoices" ON public.invoices;
DROP POLICY IF EXISTS "Manager update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Manager write invoices" ON public.invoices;

-- Remove manager access to invoice_students
DROP POLICY IF EXISTS "Manager read invoice_students" ON public.invoice_students;
DROP POLICY IF EXISTS "Manager write invoice_students" ON public.invoice_students;
