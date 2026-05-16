-- WOW Link migration
-- Adds listing_id to agent_invites so the magic link opens a real listing demo
-- Run once in Supabase SQL editor

ALTER TABLE agent_invites
  ADD COLUMN IF NOT EXISTS listing_id text REFERENCES listings(id) ON DELETE SET NULL;
