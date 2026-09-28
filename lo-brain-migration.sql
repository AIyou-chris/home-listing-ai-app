-- ============================================================
-- LO Brain (overhaul slice 1) — idempotent, safe to re-run.
-- Extends lo_chatbot_configs into the "Loan Officer Brain":
-- rulebooks, tone, compliance fields. Adds feedback + compliance log.
-- Run in Supabase SQL editor.
-- ============================================================

-- Rulebooks + tone
ALTER TABLE lo_chatbot_configs ADD COLUMN IF NOT EXISTS tone TEXT NOT NULL DEFAULT 'Friendly and straight';
ALTER TABLE lo_chatbot_configs ADD COLUMN IF NOT EXISTS nmls_in_intro BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE lo_chatbot_configs ADD COLUMN IF NOT EXISTS marketing_voice TEXT;
ALTER TABLE lo_chatbot_configs ADD COLUMN IF NOT EXISTS loan_advisor_rules TEXT;
ALTER TABLE lo_chatbot_configs ADD COLUMN IF NOT EXISTS borrower_care_rules TEXT;

-- Compliance Brain
ALTER TABLE lo_chatbot_configs ADD COLUMN IF NOT EXISTS compliance_rules TEXT DEFAULT '';
ALTER TABLE lo_chatbot_configs ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE lo_chatbot_configs ADD COLUMN IF NOT EXISTS company_nmls TEXT;
ALTER TABLE lo_chatbot_configs ADD COLUMN IF NOT EXISTS licensed_states TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE lo_chatbot_configs ADD COLUMN IF NOT EXISTS required_disclosure TEXT;
ALTER TABLE lo_chatbot_configs ADD COLUMN IF NOT EXISTS banned_phrases TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE lo_chatbot_configs ADD COLUMN IF NOT EXISTS equal_housing BOOLEAN NOT NULL DEFAULT TRUE;

-- "Good answer / Needs work" from the Talk-to-your-brain test chat
CREATE TABLE IF NOT EXISTS lo_brain_feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lo_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  rating      TEXT NOT NULL CHECK (rating IN ('good', 'needs_work')),
  route       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lo_brain_feedback_agent_idx ON lo_brain_feedback (lo_agent_id, created_at DESC);
ALTER TABLE lo_brain_feedback ENABLE ROW LEVEL SECURITY;

-- Every reply the Compliance Brain fixed or stopped
CREATE TABLE IF NOT EXISTS lo_compliance_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lo_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  listing_id  UUID,
  channel     TEXT NOT NULL DEFAULT 'listing_chat',
  action      TEXT NOT NULL CHECK (action IN ('fixed', 'blocked')),
  reason      TEXT NOT NULL,
  original    TEXT,
  final       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lo_compliance_events_agent_idx ON lo_compliance_events (lo_agent_id, created_at DESC);
ALTER TABLE lo_compliance_events ENABLE ROW LEVEL SECURITY;
-- Backend uses the service role; no public policies on the two new tables.

-- Verify:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'lo_chatbot_configs' ORDER BY 1;
-- SELECT to_regclass('lo_brain_feedback'), to_regclass('lo_compliance_events');
