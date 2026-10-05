-- Admin-only backend access; never grant browser roles access to campaign data.
create table if not exists public.admin_marketing_campaigns (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  brief jsonb not null,
  outputs jsonb not null default '{}'::jsonb,
  status text not null default 'brief' check (status in ('brief','generating','draft','approved','failed')),
  generation_attempts integer not null default 0 check (generation_attempts between 0 and 3),
  generation_error text,
  brain_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists admin_marketing_campaigns_owner_created_idx on public.admin_marketing_campaigns(owner_id, created_at desc);
alter table public.admin_marketing_campaigns enable row level security;
revoke all on public.admin_marketing_campaigns from anon, authenticated;
grant select, insert, update, delete on public.admin_marketing_campaigns to service_role;
