-- #17 Office Tier migration
-- Run once in Supabase SQL editor.

-- 1. Link LOs to an office. An office is an agents row with account_type='office'.
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS office_id uuid REFERENCES agents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agents_office_id ON agents(office_id);

-- 2. Office → LO email invites (mirrors agent_invites; token auto-generated).
CREATE TABLE IF NOT EXISTS office_lo_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  invited_email text NOT NULL,
  invited_name text,
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  claimed_at timestamptz,
  claimed_agent_id uuid REFERENCES agents(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_office_lo_invites_office ON office_lo_invites(office_id);
CREATE INDEX IF NOT EXISTS idx_office_lo_invites_email ON office_lo_invites(invited_email);

ALTER TABLE office_lo_invites ENABLE ROW LEVEL SECURITY;

-- Public can read an unclaimed invite by token (for the claim page).
DROP POLICY IF EXISTS office_lo_invites_public_read ON office_lo_invites;
CREATE POLICY office_lo_invites_public_read ON office_lo_invites
  FOR SELECT USING (true);
