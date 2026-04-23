-- Cleanup audit test data
DELETE FROM public.session_reports WHERE teacher_id = '7e3820f3-1c09-4e7b-9bae-dddfba01021b';
DELETE FROM public.sessions WHERE teacher_id = '7e3820f3-1c09-4e7b-9bae-dddfba01021b';
DELETE FROM public.students WHERE id = '5099d6ec-a27d-4bb3-bded-32ef1c4c8b48';
DELETE FROM public.teachers WHERE id = '7e3820f3-1c09-4e7b-9bae-dddfba01021b';
DELETE FROM public.user_roles WHERE user_id = '381aa0af-204f-4152-89ff-74c5a579f4b9';
DELETE FROM public.profiles WHERE user_id = '381aa0af-204f-4152-89ff-74c5a579f4b9';
DELETE FROM auth.users WHERE id = '381aa0af-204f-4152-89ff-74c5a579f4b9';