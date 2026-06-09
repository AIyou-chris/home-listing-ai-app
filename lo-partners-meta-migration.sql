-- Migration: add partner meta columns to lo_agent_partnerships
-- Run in Supabase SQL editor

ALTER TABLE lo_agent_partnerships
  ADD COLUMN IF NOT EXISTS notes       TEXT,
  ADD COLUMN IF NOT EXISTS rating      VARCHAR(10),
  ADD COLUMN IF NOT EXISTS last_follow_up TIMESTAMPTZ;
