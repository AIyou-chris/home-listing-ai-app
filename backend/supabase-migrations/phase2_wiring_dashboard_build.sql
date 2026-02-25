-- Phase 2: Lead intelligence + automation recipes + ROI metrics tables

BEGIN;

ALTER TABLE IF EXISTS public.leads
  ADD COLUMN IF NOT EXISTS intent_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS intent_level text DEFAULT 'Warm',
  ADD COLUMN IF NOT EXISTS lead_summary text,
  ADD COLUMN IF NOT EXISTS next_best_action text,
  ADD COLUMN IF NOT EXISTS intent_tags text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS last_intent_at timestamptz;

ALTER TABLE IF EXISTS public.leads
  ADD CONSTRAINT leads_intent_score_check CHECK (intent_score >= 0 AND intent_score <= 100) NOT VALID;

ALTER TABLE IF EXISTS public.leads
  DROP CONSTRAINT IF EXISTS leads_intent_level_check;

ALTER TABLE IF EXISTS public.leads
  ADD CONSTRAINT leads_intent_level_check
  CHECK (intent_level IN ('Hot', 'Warm', 'Cold'))
  NOT VALID;

CREATE TABLE IF NOT EXISTS public.lead_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  conversation_id uuid NULL,
  intent_type text NOT NULL,
  confidence numeric NOT NULL DEFAULT 0.7,
  source text NOT NULL DEFAULT 'rule',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_intents_lead
  ON public.lead_intents (lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_intents_intent_type
  ON public.lead_intents (intent_type, created_at DESC);

CREATE TABLE IF NOT EXISTS public.lead_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  summary text NOT NULL,
  next_best_action text,
  generated_by text NOT NULL DEFAULT 'rule',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_summaries_lead
  ON public.lead_summaries (lead_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  name text NOT NULL,
  trigger text NOT NULL,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  actions jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_automation_rules_agent_name
  ON public.automation_rules (agent_id, name);

CREATE INDEX IF NOT EXISTS idx_automation_rules_agent_enabled
  ON public.automation_rules (agent_id, enabled);

CREATE TABLE IF NOT EXISTS public.metrics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  metric_date date NOT NULL,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_metrics_daily_agent_date
  ON public.metrics_daily (agent_id, metric_date);

ALTER TABLE IF EXISTS public.appointments
  DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE IF EXISTS public.appointments
  ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('scheduled', 'confirmed', 'reschedule_requested', 'rescheduled', 'canceled', 'cancelled', 'completed', 'Scheduled', 'Confirmed', 'Rescheduled', 'Cancelled', 'Completed'))
  NOT VALID;

ALTER TABLE IF EXISTS public.lead_events
  DROP CONSTRAINT IF EXISTS lead_events_type_check;

ALTER TABLE IF EXISTS public.lead_events
  ADD CONSTRAINT lead_events_type_check
  CHECK (type IN (
    'LEAD_CREATED',
    'LEAD_DEDUPED',
    'CONTACT_CAPTURED',
    'CONSENT_RECORDED',
    'STATUS_UPDATED',
    'NOTIFIED_AGENT',
    'APPOINTMENT_CREATED',
    'REMINDER_QUEUED',
    'REMINDER_SENT',
    'REMINDER_FAILED',
    'REMINDER_SUPPRESSED',
    'APPOINTMENT_CONFIRMED',
    'APPOINTMENT_RESCHEDULE_REQUESTED',
    'HUMAN_HANDOFF_REQUESTED',
    'VOICEMAIL_LEFT',
    'NO_ANSWER'
  ))
  NOT VALID;

COMMIT;
