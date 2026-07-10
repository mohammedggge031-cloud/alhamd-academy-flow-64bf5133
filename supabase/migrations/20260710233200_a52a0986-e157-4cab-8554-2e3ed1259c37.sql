
ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS job_title_en text,
  ADD COLUMN IF NOT EXISTS job_title_ar text,
  ADD COLUMN IF NOT EXISTS bio_en text,
  ADD COLUMN IF NOT EXISTS bio_ar text,
  ADD COLUMN IF NOT EXISTS show_on_arabic_website boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_on_english_website boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS languages text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS teaching_audience text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS specializations text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS experience_years integer,
  ADD COLUMN IF NOT EXISTS certificates text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS translation_status text NOT NULL DEFAULT 'not_generated',
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE OR REPLACE FUNCTION public.validate_teacher_publish_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.translation_status NOT IN ('not_generated','generated','manually_edited','needs_regeneration') THEN
    RAISE EXCEPTION 'invalid translation_status: %', NEW.translation_status;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_validate_teacher_publish ON public.teachers;
CREATE TRIGGER trg_validate_teacher_publish
  BEFORE INSERT OR UPDATE ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.validate_teacher_publish_fields();

CREATE OR REPLACE FUNCTION public.slugify(_input text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT trim(both '-' from
    regexp_replace(
      regexp_replace(lower(coalesce(_input,'')), '[^a-z0-9\u0600-\u06FF]+', '-', 'g'),
      '-+', '-', 'g'
    )
  );
$$;

UPDATE public.teachers
SET bio_en = COALESCE(bio_en, bio, about)
WHERE bio_en IS NULL;

UPDATE public.teachers
SET show_on_english_website = show_on_website
WHERE show_on_english_website = false AND show_on_website = true;

WITH src AS (
  SELECT t.id,
         COALESCE(NULLIF(public.slugify(p.full_name), ''), 'teacher-' || substr(t.id::text,1,8)) AS base_slug
  FROM public.teachers t
  LEFT JOIN public.profiles p ON p.user_id = t.user_id
  WHERE t.slug IS NULL OR t.slug = ''
),
numbered AS (
  SELECT id, base_slug,
         row_number() OVER (PARTITION BY base_slug ORDER BY id) AS rn
  FROM src
)
UPDATE public.teachers t
SET slug = CASE WHEN n.rn = 1 THEN n.base_slug ELSE n.base_slug || '-' || n.rn END
FROM numbered n
WHERE t.id = n.id;

CREATE UNIQUE INDEX IF NOT EXISTS teachers_slug_unique_idx
  ON public.teachers (slug)
  WHERE slug IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS teachers_public_listing_idx
  ON public.teachers (show_on_website, is_active, deleted_at, display_order, is_featured);

CREATE OR REPLACE FUNCTION public.set_teacher_published_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.show_on_website = true
     AND (TG_OP = 'INSERT' OR OLD.show_on_website IS DISTINCT FROM true)
     AND NEW.published_at IS NULL THEN
    NEW.published_at := now();
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_set_teacher_published_at ON public.teachers;
CREATE TRIGGER trg_set_teacher_published_at
  BEFORE INSERT OR UPDATE ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.set_teacher_published_at();
