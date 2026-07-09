-- Applied to Supabase (yocchddxdsaldgsibmmc) on 2026-07-08 via MCP as
-- migration `agents_usage_billing_columns`. Kept for the repo record.
--
-- Code in backend/server.cjs (voice usage widget, /api/admin/billing),
-- backend/utils/billingSettings.js and backend/services/smsService.js
-- queries these agents columns, but they were never created. Every voice-
-- usage read, billing renewal-date read, and — most importantly — every SMS
-- quota increment (sms_sent_monthly, the 250/mo plan counter) failed
-- silently, surfacing as recurring "column does not exist" errors in the
-- Postgres logs every few hours.
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS voice_minutes_used integer NOT NULL DEFAULT 0;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS sms_sent_monthly integer NOT NULL DEFAULT 0;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS current_period_end timestamptz;
