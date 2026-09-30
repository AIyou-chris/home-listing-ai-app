-- Sold / archive tracking on the canonical listings table (properties).
-- Idempotent and additive. Applied 2026-09-30.
alter table public.properties add column if not exists sold_at timestamptz;
alter table public.properties add column if not exists sold_price numeric;
alter table public.properties add column if not exists archived_at timestamptz;
