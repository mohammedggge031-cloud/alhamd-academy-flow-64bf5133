
-- Safely recreate views by DROP + CREATE to avoid column-rename errors

-- 1. teachers_self_view
DROP VIEW IF EXISTS public.teachers_self_view;
CREATE VIEW public.teachers_self_view AS
SELECT id, user_id, age, qualification, hourly_rate, zoom_link, is_active, created_at
FROM public.teachers;

-- 2. teachers_manager_view (hides financial fields from managers)
DROP VIEW IF EXISTS public.teachers_manager_view;
CREATE VIEW public.teachers_manager_view AS
SELECT id, user_id, age, qualification, subjects, zoom_link, bio,
       academic_degree, ijazat, gender, rating, students_count,
       is_active, profile_completed, show_on_website,
       website_visible_fields, rate_currency, created_at, updated_at
FROM public.teachers;
