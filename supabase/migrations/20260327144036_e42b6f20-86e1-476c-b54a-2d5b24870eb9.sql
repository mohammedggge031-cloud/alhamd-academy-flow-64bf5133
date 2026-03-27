
-- Academy settings table for persisting app configuration
CREATE TABLE public.academy_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.academy_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access academy_settings" ON public.academy_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Manager read academy_settings" ON public.academy_settings FOR SELECT TO authenticated USING (has_role(auth.uid(), 'manager'::app_role));

-- Insert default settings
INSERT INTO public.academy_settings (key, value) VALUES
  ('academy_name', 'Alhamd Academy'),
  ('default_timezone', 'Africa/Cairo'),
  ('default_currency', 'USD'),
  ('whatsapp_reminder', 'true'),
  ('reminder_before_minutes', '60'),
  ('due_invoice_reminder', 'true'),
  ('low_balance_alert', 'true');

-- Trigger for updated_at
CREATE TRIGGER update_academy_settings_updated_at BEFORE UPDATE ON public.academy_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
