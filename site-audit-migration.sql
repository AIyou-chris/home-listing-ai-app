-- Site Audit Outreach (AI YOU) — prospect CRM, suppression, run history
-- Idempotent: safe to run multiple times. Purely additive — touches no existing table.
--
-- These tables belong to the AI YOU small-business outreach engine and are
-- deliberately separate from the lo_* tables: different brand, different
-- sending domain, different suppression list. Nothing here is shared with the
-- HomeListingAI product data.

-- ── Prospects: one row per business website, and the CRM record for it ──────
create table if not exists public.site_audit_prospects (
  id            uuid primary key default gen_random_uuid(),

  -- Identity. website is the dedup key (normalized, e.g. https://ikhaya.com/).
  website       text unique not null,
  business_name text,
  email         text,
  phone         text,
  address       text,
  city          text,
  niche         text,                        -- "barbershops"
  search_query  text,                        -- "barbershops in Seattle"
  google_rating numeric(2,1),
  google_reviews integer,
  source        text not null default 'apify_maps',

  -- Audit results. audit_status: pending | audited | clean | unreachable
  --                              | needs_render | invalid_url | failed
  audit_status  text not null default 'pending',
  audited_at    timestamptz,
  overall_score integer,
  issue_count   integer,
  scores        jsonb,                       -- { speed, mobile, trust, found, contact }
  findings      jsonb,                       -- [{ id, category, severity, title, impact, evidence }]
  top_issue     jsonb,
  pages_checked jsonb,
  speed         jsonb,                       -- { mobileScore, lcpSeconds }
  screenshot_mobile_url  text,
  screenshot_desktop_url text,
  audit_error   text,

  -- Outreach. status: new | approved | sent | opened | clicked | replied
  --                   | skipped | bounced | unsubscribed
  report_token  text unique,
  status        text not null default 'new',
  approved_at   timestamptz,
  sent_at       timestamptz,
  opened_at     timestamptz,
  clicked_at    timestamptz,
  replied_at    timestamptz,
  send_error    text,
  notes         text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists site_audit_prospects_status_idx
  on public.site_audit_prospects (status);
create index if not exists site_audit_prospects_audit_status_idx
  on public.site_audit_prospects (audit_status);
create index if not exists site_audit_prospects_token_idx
  on public.site_audit_prospects (report_token);
create index if not exists site_audit_prospects_created_at_idx
  on public.site_audit_prospects (created_at desc);
create index if not exists site_audit_prospects_score_idx
  on public.site_audit_prospects (overall_score);

-- Keep updated_at honest without the app having to remember.
create or replace function public.touch_site_audit_prospects()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists site_audit_prospects_touch on public.site_audit_prospects;
create trigger site_audit_prospects_touch
  before update on public.site_audit_prospects
  for each row execute function public.touch_site_audit_prospects();

-- ── Suppression: never email these again. Separate from lo_suppression_list ──
create table if not exists public.site_audit_suppression (
  email     text primary key,                -- lowercased
  reason    text,                            -- unsubscribe | bounce | complaint | manual
  added_at  timestamptz not null default now()
);

-- ── Run history: what we searched for and what came back ────────────────────
create table if not exists public.site_audit_runs (
  id            uuid primary key default gen_random_uuid(),
  search_query  text not null,
  niche         text,
  city          text,
  requested     integer,
  found         integer not null default 0,
  with_website  integer not null default 0,
  imported      integer not null default 0,   -- new rows actually inserted
  engine        text,
  status        text not null default 'running', -- running | done | failed
  error         text,
  created_by    text,                          -- admin auth id
  created_at    timestamptz not null default now(),
  finished_at   timestamptz
);

create index if not exists site_audit_runs_created_at_idx
  on public.site_audit_runs (created_at desc);
