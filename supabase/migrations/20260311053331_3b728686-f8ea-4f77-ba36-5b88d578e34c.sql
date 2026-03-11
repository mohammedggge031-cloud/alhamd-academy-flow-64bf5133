
ALTER TABLE public.teachers 
ADD COLUMN show_on_website boolean DEFAULT false,
ADD COLUMN website_visible_fields text[] DEFAULT '{}'::text[];
