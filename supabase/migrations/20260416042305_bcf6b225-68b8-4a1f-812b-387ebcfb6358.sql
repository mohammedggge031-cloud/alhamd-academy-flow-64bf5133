
-- Fix storage policies: DELETE and UPDATE should require authenticated, not public
-- Also allow admins to delete/update

DROP POLICY IF EXISTS "Teachers delete own files" ON storage.objects;
CREATE POLICY "Teachers delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'teacher-files'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

DROP POLICY IF EXISTS "Teachers update own files" ON storage.objects;
CREATE POLICY "Teachers update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'teacher-files'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

DROP POLICY IF EXISTS "Teachers upload own files" ON storage.objects;
CREATE POLICY "Teachers upload own files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'teacher-files'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);
