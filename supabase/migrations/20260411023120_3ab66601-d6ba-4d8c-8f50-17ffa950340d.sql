ALTER TABLE public.regulations ADD COLUMN IF NOT EXISTS section_title_en TEXT DEFAULT '';
ALTER TABLE public.regulations ADD COLUMN IF NOT EXISTS items_en JSONB DEFAULT '[]'::jsonb;