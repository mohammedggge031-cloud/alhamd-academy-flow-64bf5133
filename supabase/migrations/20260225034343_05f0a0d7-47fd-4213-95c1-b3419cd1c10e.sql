-- Enable realtime for sessions table (bookings tables already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;