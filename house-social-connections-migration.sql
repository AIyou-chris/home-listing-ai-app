-- HomeListingAI's own social accounts (Facebook, Instagram, YouTube, LinkedIn), connected from the admin.
-- Run once in the Supabase SQL editor. Safe to run twice. Tokens are encrypted by the API before they reach this table.

create table if not exists house_social_connections (
  platform text primary key check (platform in ('facebook', 'instagram', 'youtube', 'linkedin', 'tiktok')),
  status text not null default 'connected' check (status in ('connected', 'needs_reconnect', 'revoked')),
  account_label text not null default '',
  external_account_id text not null default '',
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  scope text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  connected_by uuid references auth.users(id) on delete set null,
  last_checked_at timestamptz,
  last_error text not null default '',
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table house_social_connections enable row level security;

-- Durable OAuth state lets a connection survive a server restart between the
-- admin leaving for a provider's consent screen and returning from it. Held
-- apart from the customer states so the shared callback can tell a staff
-- connection from a customer one by which table the state is found in.
create table if not exists house_social_oauth_states (
  state_hash text primary key,
  platform text not null check (platform in ('facebook', 'instagram', 'youtube', 'linkedin', 'tiktok')),
  code_verifier text not null default '',
  started_by uuid references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table house_social_oauth_states enable row level security;
create index if not exists idx_house_social_oauth_states_expiry
  on house_social_oauth_states(expires_at);

