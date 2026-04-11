
-- Delete the test teacher account (cascades to profiles, user_roles, teachers)
DELETE FROM auth.users WHERE id = 'b48ecf56-050b-454c-ae31-ea34c05cb4b2';
