
-- Add missing columns to students table
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS paid_hours numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS attended_hours numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS absence_hours numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS session_duration_minutes integer DEFAULT 60;
