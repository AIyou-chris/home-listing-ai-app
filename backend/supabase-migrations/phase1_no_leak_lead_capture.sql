-- Phase 1: NO-LEAK lead capture contract
-- Adds capture/dedupe fields + audit trail while staying compatible with existing tables.

BEGIN;

-- Extend leads table for capture contract.
ALTER TABLE IF EXISTS public.leads
  ADD COLUMN IF NOT EXISTS agent_id uuid,
  ADD COLUMN IF NOT EXISTS listing_id uuid,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS phone_e164 text,
  ADD COLUMN IF NOT EXISTS email_lower text,
  ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS source_meta jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS consent_sms boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_timestamp timestamptz,
  ADD COLUMN IF NOT EXISTS intent_level text DEFAULT 'Warm',
  ADD COLUMN IF NOT EXISTS timeline text DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS financing text DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS working_with_agent text DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS last_message_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_message_preview text;

-- Backfill compatibility fields for existing rows.
UPDATE public.leads
SET
  agent_id = COALESCE(agent_id, user_id),
  full_name = COALESCE(NULLIF(full_name, ''), NULLIF(name, '')),
  email_lower = COALESCE(email_lower, lower(NULLIF(email, ''))),
  source_type = COALESCE(NULLIF(source_type, ''), NULLIF(source, ''), 'unknown'),
  intent_level = COALESCE(NULLIF(intent_level, ''), 'Warm'),
  timeline = COALESCE(NULLIF(timeline, ''), 'unknown'),
  financing = COALESCE(NULLIF(financing, ''), 'unknown'),
  working_with_agent = COALESCE(NULLIF(working_with_agent, ''), 'unknown')
WHERE true;

-- Normalize one common US phone format into E.164 when missing.
UPDATE public.leads
SET phone_e164 = '+1' || regexp_replace(phone, '\D', '', 'g')
WHERE phone_e164 IS NULL
  AND phone IS NOT NULL
  AND length(regexp_replace(phone, '\D', '', 'g')) = 10;

UPDATE public.leads
SET phone_e164 = '+' || regexp_replace(phone, '\D', '', 'g')
WHERE phone_e164 IS NULL
  AND phone IS NOT NULL
  AND length(regexp_replace(phone, '\D', '', 'g')) = 11
  AND regexp_replace(phone, '\D', '', 'g') LIKE '1%';

-- Tighten domain values without breaking legacy records.
ALTER TABLE IF EXISTS public.leads
  ADD CONSTRAINT leads_source_type_check
  CHECK (source_type IN ('link', 'qr', 'open_house', 'social', 'unknown'))
  NOT VALID;

ALTER TABLE IF EXISTS public.leads
  ADD CONSTRAINT leads_intent_level_check
  CHECK (intent_level IN ('Hot', 'Warm', 'Cold'))
  NOT VALID;

ALTER TABLE IF EXISTS public.leads
  ADD CONSTRAINT leads_timeline_check
  CHECK (timeline IN ('0-30', '1-3mo', '3+', 'unknown'))
  NOT VALID;

ALTER TABLE IF EXISTS public.leads
  ADD CONSTRAINT leads_financing_check
  CHECK (financing IN ('preapproved', 'cash', 'exploring', 'unknown'))
  NOT VALID;

ALTER TABLE IF EXISTS public.leads
  ADD CONSTRAINT leads_working_with_agent_check
  CHECK (working_with_agent IN ('yes', 'no', 'unknown'))
  NOT VALID;

ALTER TABLE IF EXISTS public.leads
  ADD CONSTRAINT leads_status_check
  CHECK (status IN ('New', 'Contacted', 'Nurture', 'Closed-Lost', 'Qualified', 'Showing', 'Lost', 'Bounced', 'Unsubscribed', 'Won', 'Marketing Only'))
  NOT VALID;

CREATE INDEX IF NOT EXISTS idx_leads_agent_id
  ON public.leads (agent_id);

CREATE INDEX IF NOT EXISTS idx_leads_listing_id
  ON public.leads (listing_id);

CREATE INDEX IF NOT EXISTS idx_leads_phone_e164
  ON public.leads (phone_e164);

CREATE INDEX IF NOT EXISTS idx_leads_email_lower
  ON public.leads (email_lower);

-- Dedupe guarantees scoped by agent + listing.
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_dedupe_agent_listing_phone
  ON public.leads (agent_id, listing_id, phone_e164)
  WHERE phone_e164 IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_dedupe_agent_listing_email
  ON public.leads (agent_id, listing_id, email_lower)
  WHERE email_lower IS NOT NULL;

-- Audit trail for lead lifecycle.
CREATE TABLE IF NOT EXISTS public.lead_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_events_lead_id
  ON public.lead_events (lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_events_type
  ON public.lead_events (type, created_at DESC);

ALTER TABLE IF EXISTS public.lead_events
  ADD CONSTRAINT lead_events_type_check
  CHECK (type IN ('LEAD_CREATED', 'LEAD_DEDUPED', 'CONTACT_CAPTURED', 'CONSENT_RECORDED', 'STATUS_UPDATED', 'NOTIFIED_AGENT'))
  NOT VALID;

-- Ensure conversation linkage field exists for capture path.
ALTER TABLE IF EXISTS public.ai_conversations
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL;

COMMIT;
