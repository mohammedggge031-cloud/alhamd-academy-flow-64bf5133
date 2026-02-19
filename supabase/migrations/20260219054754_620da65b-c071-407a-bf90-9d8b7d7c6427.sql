
-- Create invoice_students junction table for multi-student invoices
CREATE TABLE public.invoice_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id),
  hours numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access invoice_students"
  ON public.invoice_students FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Make student_id nullable on invoices to support multi-student invoices
ALTER TABLE public.invoices ALTER COLUMN student_id DROP NOT NULL;

-- Add hours column to invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS hours numeric DEFAULT 0;

-- Add unique constraint on whatsapp for students
ALTER TABLE public.students ADD CONSTRAINT students_whatsapp_unique UNIQUE (whatsapp);
