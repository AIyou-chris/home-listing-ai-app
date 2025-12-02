-- 1. Create roles table
create table if not exists public.roles (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create user_roles table (linking users to roles)
create table if not exists public.user_roles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  role_id uuid references public.roles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, role_id)
);

-- 3. Enable RLS
alter table public.roles enable row level security;
alter table public.user_roles enable row level security;

-- 4. Policies
-- Allow everyone to read roles (needed for checks)
DROP POLICY IF EXISTS "Everyone can read roles" ON public.roles;
create policy "Everyone can read roles" on public.roles for select using (true);

-- Users can read their own roles
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
create policy "Users can read own roles" on public.user_roles 
  for select using (auth.uid() = user_id);

-- 5. Create the is_user_admin function (Exact signature from handoff)
CREATE OR REPLACE FUNCTION public.is_user_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = uid
      AND r.name = 'admin'
  );
$$;

-- 6. Permissions
GRANT EXECUTE ON FUNCTION public.is_user_admin(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.is_user_admin(uuid) FROM anon;

-- 7. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_roles_name ON public.roles(name);

-- 8. Seed Data (Create 'admin' role and assign to your user)
DO $$
DECLARE
  admin_role_id uuid;
BEGIN
  -- Insert 'admin' role if it doesn't exist
  INSERT INTO public.roles (name) VALUES ('admin')
  ON CONFLICT (name) DO NOTHING;

  -- Get the admin role ID
  SELECT id INTO admin_role_id FROM public.roles WHERE name = 'admin';

  -- Assign admin role to your specific user ID
  INSERT INTO public.user_roles (user_id, role_id)
  VALUES ('cbe4d568-3254-4af4-aa8d-3fe12d4848c3', admin_role_id)
  ON CONFLICT (user_id, role_id) DO NOTHING;
END $$;
