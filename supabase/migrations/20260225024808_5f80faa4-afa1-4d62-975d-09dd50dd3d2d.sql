
-- Table for subscription requests from pricing plans
CREATE TABLE public.subscription_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  plan_price TEXT,
  sessions_per_week TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  is_read BOOLEAN NOT NULL DEFAULT false,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_requests ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admin full access subscription_requests"
ON public.subscription_requests FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Manager read
CREATE POLICY "Manager read subscription_requests"
ON public.subscription_requests FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role));

-- Manager update
CREATE POLICY "Manager update subscription_requests"
ON public.subscription_requests FOR UPDATE
USING (has_role(auth.uid(), 'manager'::app_role));

-- Anyone can insert (for external website forms)
CREATE POLICY "Anyone can insert subscription_requests"
ON public.subscription_requests FOR INSERT
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_subscription_requests_updated_at
BEFORE UPDATE ON public.subscription_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
