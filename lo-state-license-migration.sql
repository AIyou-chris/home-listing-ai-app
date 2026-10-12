-- Migration: Add state_license_number to agents table
-- Run this in Supabase SQL editor

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS state_license_number text;
