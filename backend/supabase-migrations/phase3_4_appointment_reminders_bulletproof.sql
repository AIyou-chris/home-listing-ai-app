-- Phase 3.4: Appointment reminders become bulletproof + beautiful

BEGIN;

ALTER TABLE IF EXISTS public.appointments
  ADD COLUMN IF NOT EXISTS confirmation_status text,
  ADD COLUMN IF NOT EXISTS last_reminder_outcome text,
  ADD COLUMN IF NOT EXISTS last_reminder_at timestamptz;

ALTER TABLE IF EXISTS public.appointments
  ALTER COLUMN confirmation_status SET DEFAULT 'needs_confirmation';

UPDATE public.appointments
SET confirmation_status = CASE
  WHEN lower(COALESCE(status, '')) = 'confirmed' THEN 'confirmed'
  WHEN lower(COALESCE(status, '')) IN ('canceled', 'cancelled', 'completed') THEN 'unknown'
  ELSE 'needs_confirmation'
END
WHERE confirmation_status IS NULL;

ALTER TABLE IF EXISTS public.appointments
  DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE IF EXISTS public.appointments
  ADD CONSTRAINT appointments_status_check
  CHECK (
    status IN (
      'scheduled',
      'confirmed',
      'reschedule_requested',
      'canceled',
      'completed',
      'rescheduled',
      'cancelled',
      'Scheduled',
      'Confirmed',
      'Rescheduled',
      'Cancelled',
      'Completed'
    )
  )
  NOT VALID;

ALTER TABLE IF EXISTS public.appointments
  DROP CONSTRAINT IF EXISTS appointments_confirmation_status_check;

ALTER TABLE IF EXISTS public.appointments
  ADD CONSTRAINT appointments_confirmation_status_check
  CHECK (confirmation_status IN ('needs_confirmation', 'confirmed', 'unknown'))
  NOT VALID;

ALTER TABLE IF EXISTS public.appointment_reminders
  ADD COLUMN IF NOT EXISTS agent_id uuid,
  ADD COLUMN IF NOT EXISTS lead_id uuid,
  ADD COLUMN IF NOT EXISTS idempotency_key text;

UPDATE public.appointment_reminders AS ar
SET
  agent_id = COALESCE(ar.agent_id, a.agent_id, a.user_id),
  lead_id = COALESCE(ar.lead_id, a.lead_id)
FROM public.appointments AS a
WHERE a.id = ar.appointment_id
  AND (ar.agent_id IS NULL OR ar.lead_id IS NULL);

ALTER TABLE IF EXISTS public.appointment_reminders
  DROP CONSTRAINT IF EXISTS appointment_reminders_status_check;

ALTER TABLE IF EXISTS public.appointment_reminders
  ADD CONSTRAINT appointment_reminders_status_check
  CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'suppressed', 'canceled'))
  NOT VALID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_appointment_reminders_idempotency
  ON public.appointment_reminders (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointment_reminders_agent_status
  ON public.appointment_reminders (agent_id, status, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_appointment_reminders_lead
  ON public.appointment_reminders (lead_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.appointment_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointment_notes_appointment
  ON public.appointment_notes (appointment_id, created_at DESC);

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
    'REMINDER_CANCELED',
    'REMINDER_OUTCOME',
    'APPOINTMENT_CONFIRMED',
    'APPOINTMENT_RESCHEDULE_REQUESTED',
    'HUMAN_HANDOFF_REQUESTED',
    'VOICEMAIL_LEFT',
    'NO_ANSWER'
  ))
  NOT VALID;

COMMIT;
