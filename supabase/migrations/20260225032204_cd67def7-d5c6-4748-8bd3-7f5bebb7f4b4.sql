
-- Add profile fields to teachers table
ALTER TABLE public.teachers
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS academic_degree text,
ADD COLUMN IF NOT EXISTS ijazat text,
ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false;

-- Create teacher_documents table for uploaded files
CREATE TABLE public.teacher_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  document_type text NOT NULL, -- 'profile_photo', 'id_card', 'certificate', 'ijaza', 'other'
  file_url text NOT NULL,
  file_name text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.teacher_documents ENABLE ROW LEVEL SECURITY;

-- Teacher can manage own documents
CREATE POLICY "Teacher manage own documents"
ON public.teacher_documents
FOR ALL
USING (teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid()))
WITH CHECK (teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid()));

-- Admin full access
CREATE POLICY "Admin full access teacher_documents"
ON public.teacher_documents
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Manager read access
CREATE POLICY "Manager read teacher_documents"
ON public.teacher_documents
FOR SELECT
USING (public.has_role(auth.uid(), 'manager'));

-- Create storage bucket for teacher files
INSERT INTO storage.buckets (id, name, public) VALUES ('teacher-files', 'teacher-files', true);

-- Storage policies
CREATE POLICY "Teachers upload own files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'teacher-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Teachers update own files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'teacher-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Teachers delete own files"
ON storage.objects FOR DELETE
USING (bucket_id = 'teacher-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view teacher files"
ON storage.objects FOR SELECT
USING (bucket_id = 'teacher-files');
