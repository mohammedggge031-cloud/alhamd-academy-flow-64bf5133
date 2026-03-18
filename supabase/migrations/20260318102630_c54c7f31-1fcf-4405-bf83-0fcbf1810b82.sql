
ALTER TABLE public.teachers 
ADD COLUMN rate_currency text NOT NULL DEFAULT 'USD',
ADD COLUMN bonus_amount numeric DEFAULT 0,
ADD COLUMN bonus_reason text;
