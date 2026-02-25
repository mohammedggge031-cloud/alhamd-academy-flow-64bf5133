
-- Allow teachers to update their own profile fields (bio, academic_degree, ijazat, qualification, profile_completed)
CREATE POLICY "Teacher can update own profile"
ON public.teachers
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
