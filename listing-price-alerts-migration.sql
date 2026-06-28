-- listing-price-alerts-migration.sql
-- Run manually in the Supabase SQL editor. Idempotent.

create table if not exists listing_alert_subscribers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null,                 -- properties.id (rich table), NOT legacy listings
  agent_id uuid,                            -- resolved owner profile id (agents.id)
  phone text not null,                      -- E.164
  visitor_id text,
  status text not null default 'active',    -- 'active' | 'unsubscribed'
  consent_text text,
  consent_at timestamptz default now(),
  created_at timestamptz default now(),
  last_alerted_at timestamptz
);
create unique index if not exists listing_alert_subscribers_listing_phone_idx
  on listing_alert_subscribers (listing_id, phone);

create table if not exists sms_suppression (
  phone text primary key,                   -- global opt-out, checked before every send
  reason text default 'stop_reply',
  created_at timestamptz default now()
);

create table if not exists listing_alert_pending (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null,
  agent_id uuid,
  type text not null,                       -- 'price' | 'manual'
  payload jsonb not null default '{}'::jsonb,
  recipient_count integer default 0,
  status text not null default 'pending',   -- 'pending' | 'sent' | 'dismissed'
  created_at timestamptz default now(),
  sent_at timestamptz
);
create index if not exists listing_alert_pending_listing_idx
  on listing_alert_pending (listing_id, status);
