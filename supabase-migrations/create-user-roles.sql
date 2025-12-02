-- Create a table for user roles
create table if not exists public.user_roles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('admin', 'agent', 'super-admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, role)
);

-- Enable RLS
alter table public.user_roles enable row level security;

-- Policies
-- Users can read their own roles
create policy "Users can read own roles" on public.user_roles
  for select using (auth.uid() = user_id);

-- Create the is_admin RPC function
-- Security Definer means it runs with the privileges of the creator (postgres), 
-- allowing it to bypass RLS on user_roles if needed, but here we just need it to read.
create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean as $$
declare
  is_admin boolean;
begin
  select exists (
    select 1
    from public.user_roles
    where user_id = uid
    and role in ('admin', 'super-admin')
  ) into is_admin;
  
  return is_admin;
end;
$$ language plpgsql security definer;
