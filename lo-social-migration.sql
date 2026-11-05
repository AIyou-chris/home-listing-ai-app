-- Loan officers connect their own Facebook, Instagram, LinkedIn and YouTube, then approve AI-written posts.
-- Run once in the Supabase SQL editor. Safe to run twice. Tokens are encrypted by the API before they reach these tables.
-- owner_id is the loan officer's agents.id (the profile id), never the login id.

create table if not exists lo_social_connections (
  owner_id uuid not null references agents(id) on delete cascade,
  platform text not null check (platform in ('facebook', 'instagram', 'youtube', 'linkedin', 'tiktok')),
  status text not null default 'connected' check (status in ('connected', 'needs_reconnect', 'revoked')),
  account_label text not null default '',
  external_account_id text not null default '',
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  scope text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  connected_by uuid,
  last_checked_at timestamptz,
  last_error text not null default '',
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, platform)
);
alter table lo_social_connections enable row level security;

create table if not exists lo_social_oauth_states (
  state_hash text primary key,
  platform text not null check (platform in ('facebook', 'instagram', 'youtube', 'linkedin', 'tiktok')),
  code_verifier text not null default '',
  owner_id uuid not null references agents(id) on delete cascade,
  started_by uuid,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table lo_social_oauth_states enable row level security;
create index if not exists idx_lo_social_oauth_states_expiry on lo_social_oauth_states(expires_at);

-- The approval queue. A row only leaves 'draft' when the loan officer taps Approve.
create table if not exists lo_social_posts (
  id uuid primary key default gen_random_uuid(),
  lo_id uuid not null references agents(id) on delete cascade,
  text text not null default '',
  topic text,
  source text not null default 'ai' check (source in ('ai', 'manual')),
  image_url text,
  channels text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'posting', 'published', 'failed', 'rejected')),
  scheduled_for timestamptz,
  approved_at timestamptz,
  posted_at timestamptz,
  results jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table lo_social_posts enable row level security;
create index if not exists idx_lo_social_posts_lo on lo_social_posts(lo_id, created_at desc);
create index if not exists idx_lo_social_posts_due on lo_social_posts(scheduled_for) where status = 'scheduled';
