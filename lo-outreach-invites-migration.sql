-- LO Acquisition Link — tracked outreach invites
-- Idempotent: safe to run multiple times.
create table if not exists public.lo_outreach_invites (
  id          uuid primary key default gen_random_uuid(),
  token       text unique not null,
  lo_name     text,
  lo_email    text not null,
  lo_phone    text,
  lo_website  text,
  status      text not null default 'sent',   -- sent | opened | clicked
  opened_at   timestamptz,
  clicked_at  timestamptz,
  created_by  text,                            -- admin auth id (may be null)
  created_at  timestamptz not null default now()
);

create index if not exists lo_outreach_invites_token_idx
  on public.lo_outreach_invites (token);

create index if not exists lo_outreach_invites_created_at_idx
  on public.lo_outreach_invites (created_at desc);
