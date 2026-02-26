-- Phase 1 voice scope: appointment reminders only (SMS suppressed)
-- Adds reminder queue + appointment fields while preserving legacy appointment schema.

BEGIN;

ALTER TABLE IF EXISTS public.appointments
  ADD COLUMN IF NOT EXISTS agent_id uuid,
  ADD COLUMN IF NOT EXISTS listing_id uuid,
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS location text;

-- Keep legacy fields working but align new contract defaults.
ALTER TABLE IF EXISTS public.appointments
  ALTER COLUMN timezone SET DEFAULT 'America/Los_Angeles';

UPDATE public.appointments
SET
  agent_id = COALESCE(agent_id, user_id),
  listing_id = COALESCE(listing_id, property_id),
  starts_at = COALESCE(starts_at, start_iso),
  ends_at = COALESCE(ends_at, end_iso),
  timezone = COALESCE(NULLIF(timezone, ''), 'America/Los_Angeles'),
  location = COALESCE(NULLIF(location, ''), NULLIF(meet_link, ''))
WHERE true;

-- Normalize status for new reminder flow while preserving existing rows.
UPDATE public.appointments
SET status = CASE
  WHEN lower(COALESCE(status, '')) = 'scheduled' THEN 'scheduled'
  WHEN lower(COALESCE(status, '')) = 'confirmed' THEN 'confirmed'
  WHEN lower(COALESCE(status, '')) IN ('rescheduled', 'rescheduled_requested') THEN 'rescheduled'
  WHEN lower(COALESCE(status, '')) = 'canceled' THEN 'canceled'
  WHEN lower(COALESCE(status, '')) = 'completed' THEN 'completed'
  WHEN lower(COALESCE(status, '')) = 'cancelled' THEN 'canceled'
  ELSE status
END
WHERE status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_agent_id
  ON public.appointments (agent_id);

CREATE INDEX IF NOT EXISTS idx_appointments_listing_id
  ON public.appointments (listing_id);

CREATE INDEX IF NOT EXISTS idx_appointments_lead_id
  ON public.appointments (lead_id);

CREATE INDEX IF NOT EXISTS idx_appointments_starts_at
  ON public.appointments (starts_at);

CREATE INDEX IF NOT EXISTS idx_appointments_status
  ON public.appointments (status);

CREATE TABLE IF NOT EXISTS public.appointment_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  reminder_type text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  provider text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  provider_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT appointment_reminders_type_check CHECK (reminder_type IN ('voice', 'sms', 'email')),
  CONSTRAINT appointment_reminders_status_check CHECK (status IN ('queued', 'sent', 'failed', 'suppressed'))
);

CREATE INDEX IF NOT EXISTS idx_appointment_reminders_appointment
  ON public.appointment_reminders (appointment_id);

CREATE INDEX IF NOT EXISTS idx_appointment_reminders_due
  ON public.appointment_reminders (status, scheduled_for);

-- Extend lead event contract for appointment/reminder lifecycle.
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
    'VOICEMAIL_LEFT'
  ))
  NOT VALID;

COMMIT;
