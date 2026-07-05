-- Zillow cost-math follow-up email (sent 48h after each LO acquisition invite).
-- Applied to production 2026-07-05 via Supabase MCP — kept here for the record.
-- NULL followup_sent_at = not yet sent; the sweep in backend/server.cjs
-- (processLoZillowFollowups) claims rows atomically before sending.

ALTER TABLE lo_outreach_invites ADD COLUMN IF NOT EXISTS followup_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_lo_outreach_followup_due
  ON lo_outreach_invites (created_at)
  WHERE followup_sent_at IS NULL;
