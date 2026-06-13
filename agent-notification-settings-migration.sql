-- Fix: the notification "nudge" toggles (Daily digest, Unworked lead nudge,
-- Appointment confirmation nudge, Reschedule requested nudge + digest time/zone)
-- silently failed to persist — PATCH returned 200 but the value reverted on reload.
--
-- Root cause: agent_notification_settings was never created. The backend upsert
-- hit a missing table, matched its "does not exist" degrade path, and fell back
-- to an in-memory cache that the read path ignores for UUID agent ids — so the
-- value never survived a round trip. Creating the table fixes it.
--
-- agent_id is the app-level owner key (auth id is passed today). No FK, matching
-- the project's app-controlled-integrity pattern; agent_id is unique for upsert.
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS agent_notification_settings (
  agent_id                     UUID PRIMARY KEY,
  email_enabled                BOOLEAN     NOT NULL DEFAULT true,
  daily_digest_enabled         BOOLEAN     NOT NULL DEFAULT false,
  unworked_lead_nudge_enabled  BOOLEAN     NOT NULL DEFAULT true,
  appt_confirm_nudge_enabled   BOOLEAN     NOT NULL DEFAULT true,
  reschedule_nudge_enabled     BOOLEAN     NOT NULL DEFAULT true,
  digest_time_local            TEXT        NOT NULL DEFAULT '08:00',
  timezone                     TEXT        NOT NULL DEFAULT 'America/Los_Angeles',
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now()
);
