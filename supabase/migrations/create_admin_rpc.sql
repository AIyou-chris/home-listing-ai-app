-- Create the missing 'is_user_admin' function
-- This is required for the backend to recognize your admin status.

create or replace function is_user_admin(uid uuid)
returns boolean as $$
declare
  is_admin boolean;
begin
  -- Check if the user has 'claims_admin': true in their metadata
  select (raw_app_meta_data->>'claims_admin')::boolean
  into is_admin
  from auth.users
  where id = uid;
  
  return coalesce(is_admin, false);
end;
$$ language plpgsql security definer;
