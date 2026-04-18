-- Delete orphan teacher (no profile, no role, no teacher record)
DELETE FROM auth.users WHERE id = '43d1c8a9-a00a-4e38-b138-f3752f7ea84a';

-- Delete the QA test manager account
DELETE FROM auth.users WHERE id = 'faf3f15a-caf1-452f-829b-bad1bada9e5f';