-- WOW Link migration
-- Run once in Supabase SQL editor

-- 1. Add listing_id so the magic link can open a real listing demo
ALTER TABLE agent_invites
  ADD COLUMN IF NOT EXISTS listing_id uuid REFERENCES listings(id) ON DELETE SET NULL;

-- 2. Drop the lo_agent_id FK constraint.
-- The LO platform uses lo_agent_id as a logical key (the auth user id),
-- consistent with lo_chatbot_configs and listing_lo_assignments which do
-- NOT enforce an agents FK. This constraint was blocking invites for any
-- account without a matching agents.id row.
ALTER TABLE agent_invites
  DROP CONSTRAINT IF EXISTS agent_invites_lo_agent_id_fkey;
