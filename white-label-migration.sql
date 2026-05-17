-- #18 White Label migration
-- Run once in Supabase SQL editor.
-- Brand + webhook fields live on the OFFICE's agents row (account_type='office').
-- LOs under the office (agents.office_id) inherit on public surfaces, and
-- their warm leads are POSTed to the office's lead_webhook_url.

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS brand_color text,
  ADD COLUMN IF NOT EXISTS brand_logo_url text,
  ADD COLUMN IF NOT EXISTS lead_webhook_url text;
-- company (display name) column already exists and is reused as the brand name.

-- Custom domain support (run after initial white-label migration)
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS custom_domain text UNIQUE;

-- Index for fast tenant resolution by hostname
CREATE INDEX IF NOT EXISTS idx_agents_custom_domain
  ON agents (custom_domain)
  WHERE custom_domain IS NOT NULL;
