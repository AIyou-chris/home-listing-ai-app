-- Assign 'admin' role to the specified user
-- Run this in the Supabase SQL Editor

insert into public.user_roles (user_id, role)
values ('cbe4d568-3254-4af4-aa8d-3fe12d4848c3', 'admin')
on conflict (user_id, role) do nothing;

-- Verify the insertion
select * from public.user_roles where user_id = 'cbe4d568-3254-4af4-aa8d-3fe12d4848c3';
