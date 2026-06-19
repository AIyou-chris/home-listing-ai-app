-- LO Lead Finder — scraped lead pool + suppression + scraper state
-- Idempotent: safe to run multiple times. Purely additive — touches no existing table.

create table if not exists public.lo_lead_pool (
  id          uuid primary key default gen_random_uuid(),
  email       text unique not null,          -- dedup key; no email = no row
  name        text,
  employer    text,
  city        text,
  source_url  text,
  is_role     boolean not null default false, -- true for info@/admin@/etc (manual-send only)
  status      text not null default 'new',    -- new | sent | skipped
  found_at    timestamptz not null default now(),
  sent_at     timestamptz
);

create index if not exists lo_lead_pool_status_idx   on public.lo_lead_pool (status);
create index if not exists lo_lead_pool_found_at_idx  on public.lo_lead_pool (found_at desc);

create table if not exists public.lo_suppression_list (
  email     text primary key,                 -- lowercased
  reason    text,                             -- unsubscribe | bounce | manual
  added_at  timestamptz not null default now()
);

-- Single-row state for city rotation (id is always the literal 'singleton')
create table if not exists public.lo_scraper_state (
  id          text primary key default 'singleton',
  city_index  integer not null default 0,
  updated_at  timestamptz not null default now()
);

insert into public.lo_scraper_state (id, city_index)
  values ('singleton', 0)
  on conflict (id) do nothing;
