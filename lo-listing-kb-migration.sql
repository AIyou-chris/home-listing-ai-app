-- LO Listing-Specific Knowledge Base Documents
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS lo_listing_kb_docs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lo_agent_id UUID NOT NULL,            -- FK to agents.id (LO's profile id)
  address     TEXT NOT NULL,            -- listing address used to match at chat time
  label       TEXT,                     -- optional friendly name (e.g. "123 Main HOA info")
  content     TEXT NOT NULL,            -- the pasted/extracted text the bot should reference
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lo_listing_kb_docs_agent_idx ON lo_listing_kb_docs (lo_agent_id);
CREATE INDEX IF NOT EXISTS lo_listing_kb_docs_address_idx ON lo_listing_kb_docs (lo_agent_id, lower(address));

-- RLS
ALTER TABLE lo_listing_kb_docs ENABLE ROW LEVEL SECURITY;

-- LOs can only see/manage their own docs
CREATE POLICY lo_listing_kb_docs_owner ON lo_listing_kb_docs
  USING (lo_agent_id = (
    SELECT id FROM agents WHERE user_id = auth.uid() LIMIT 1
  ));

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_lo_listing_kb_docs_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER lo_listing_kb_docs_updated_at
  BEFORE UPDATE ON lo_listing_kb_docs
  FOR EACH ROW EXECUTE FUNCTION update_lo_listing_kb_docs_updated_at();
