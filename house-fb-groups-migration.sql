-- HomeListingAI's Facebook group library (for hand-posting) and a log of what was posted.
-- Safe to run twice. Only the admin API reads these (service role); browsers never do.

create table if not exists house_fb_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  facebook_url text not null default '',
  audience text not null default '',
  member_count integer not null default 0 check (member_count >= 0),
  join_status text not null default 'researching' check (join_status in ('researching', 'requested', 'joined', 'paused')),
  promotion_days text[] not null default '{}',
  links_allowed boolean,
  rules text not null default '',
  notes text not null default '',
  last_posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table house_fb_groups enable row level security;
create unique index if not exists idx_house_fb_groups_name on house_fb_groups (lower(name));

create table if not exists house_fb_group_posts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references house_fb_groups(id) on delete set null,
  group_name text not null default '',
  variant text not null default '',
  post_text text not null default '',
  notes text not null default '',
  posted_at timestamptz not null default now()
);
alter table house_fb_group_posts enable row level security;
create index if not exists idx_house_fb_group_posts_group on house_fb_group_posts (group_id, posted_at desc);
