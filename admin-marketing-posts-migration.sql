-- One row per (campaign, channel): when an approved Marketing Studio campaign goes to a connected account.
-- Safe to run twice. Only the admin API reads and writes this (service role).
create table if not exists admin_marketing_posts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references admin_marketing_campaigns(id) on delete cascade,
  channel text not null check (channel in ('facebook', 'instagram', 'linkedin', 'youtube')),
  status text not null default 'scheduled' check (status in ('scheduled', 'posting', 'published', 'failed')),
  scheduled_for timestamptz not null default now(),
  posted_at timestamptz,
  url text,
  error text,
  container_id text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, channel)
);
alter table admin_marketing_posts enable row level security;
create index if not exists idx_admin_marketing_posts_due on admin_marketing_posts (status, scheduled_for);

insert into admin_switches (key, enabled) values ('social_auto_post', false) on conflict (key) do nothing;
