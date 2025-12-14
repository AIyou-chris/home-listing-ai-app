-- 1. SETUP: Ensure the necessary tables and functions exist
create table if not exists public.roles (
  id uuid default gen_random_uuid() primary key,
  name text not null unique
);

create table if not exists public.user_roles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  role_id uuid references public.roles(id) on delete cascade not null,
  unique (user_id, role_id)
);

-- Enable RLS
alter table public.roles enable row level security;
alter table public.user_roles enable row level security;

-- Policies
DROP POLICY IF EXISTS "Everyone can read roles" ON public.roles;
create policy "Everyone can read roles" on public.roles for select using (true);

DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
create policy "Users can read own roles" on public.user_roles for select using (auth.uid() = user_id);

-- Create Admin Check Function
CREATE OR REPLACE FUNCTION public.is_user_admin(uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = uid AND r.name = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_user_admin(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.is_user_admin(uuid) FROM anon;

-- 2. CREATE ADMIN ROLE
INSERT INTO public.roles (name) VALUES ('admin') ON CONFLICT (name) DO NOTHING;

-- 3. ASSIGN ADMIN ROLE (Safer version that waits for user to exist)
-- This will only work if the user 'us@homelistingai.com' exists in the Auth Users list.
INSERT INTO public.user_roles (user_id, role_id)
SELECT u.id, r.id
FROM auth.users u, public.roles r
WHERE u.email = 'us@homelistingai.com' 
  AND r.name = 'admin'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 4. CONFIRM EMAIL
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email = 'us@homelistingai.com';
