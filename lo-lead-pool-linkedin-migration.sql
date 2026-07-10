-- LO Lead Pool: support LinkedIn-only leads (no email) for the DM queue.
-- Idempotent — safe to re-run in the Supabase SQL editor.
--
-- 1. email becomes optional (HarvestAPI LinkedIn scraper returns many profiles
--    without an email; those leads are worked via LinkedIn DM instead).
-- 2. Every lead must still be contactable: email OR linkedin required.
-- 3. Index on linkedin for the code-level dedupe lookup (email stays the
--    primary unique key; linkedin dedupe is enforced in storeBatch).

alter table lo_lead_pool alter column email drop not null;

do $$ begin
  alter table lo_lead_pool
    add constraint lo_lead_pool_contactable
    check (email is not null or linkedin is not null);
exception when duplicate_object then null; end $$;

create index if not exists lo_lead_pool_linkedin_idx on lo_lead_pool (linkedin);
