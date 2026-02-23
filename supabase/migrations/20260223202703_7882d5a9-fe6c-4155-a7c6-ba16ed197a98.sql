
-- Create trial bookings table
CREATE TABLE public.trial_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  course_interest TEXT,
  preferred_date DATE,
  preferred_time TEXT,
  timezone TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  admin_notes TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trial_bookings ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admin full access trial_bookings"
ON public.trial_bookings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Manager read + update
CREATE POLICY "Manager read trial_bookings"
ON public.trial_bookings FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Manager update trial_bookings"
ON public.trial_bookings FOR UPDATE
USING (has_role(auth.uid(), 'manager'::app_role));

-- Allow anonymous inserts (from website form)
CREATE POLICY "Anyone can insert trial_bookings"
ON public.trial_bookings FOR INSERT
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_trial_bookings_updated_at
BEFORE UPDATE ON public.trial_bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.trial_bookings;
