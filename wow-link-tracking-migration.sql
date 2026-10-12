-- Migration: Add WOW link engagement tracking to agent_invites
-- Run this in Supabase SQL editor

ALTER TABLE agent_invites
  ADD COLUMN IF NOT EXISTS opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS cta_clicked_at timestamptz;
