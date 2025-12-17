-- GRANT ADMIN PRIVILEGES
-- Run this in Supabase SQL Editor to unblock access immediately.

-- 1. Update the user metadata to set 'claims_admin' to true
UPDATE auth.users
SET raw_app_meta_data = 
  jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{claims_admin}',
    'true'
  )
WHERE email = 'us@homelistingai.com';

-- 2. Verify the update (Optional - checking the change)
-- SELECT email, raw_app_meta_data FROM auth.users WHERE email = 'us@homelistingai.com';
