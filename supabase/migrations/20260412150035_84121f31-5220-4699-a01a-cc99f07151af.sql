ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS exception_minutes integer DEFAULT 0;

COMMENT ON COLUMN public.sessions.exception_minutes IS 'Extra minutes admin/manager can grant to teacher for absent sessions as exceptions';