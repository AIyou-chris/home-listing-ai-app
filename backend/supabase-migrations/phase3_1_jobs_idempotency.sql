-- Phase 3.1: Production-grade jobs + idempotency + retries

BEGIN;

CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  priority integer NOT NULL DEFAULT 5,
  run_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  locked_at timestamptz,
  locked_by text,
  last_error text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT jobs_status_check CHECK (status IN ('queued', 'processing', 'succeeded', 'failed', 'dead')),
  CONSTRAINT jobs_priority_check CHECK (priority BETWEEN 1 AND 10),
  CONSTRAINT jobs_attempts_check CHECK (attempts >= 0),
  CONSTRAINT jobs_max_attempts_check CHECK (max_attempts >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_idempotency_key
  ON public.jobs (idempotency_key);

CREATE INDEX IF NOT EXISTS idx_jobs_status_run_at
  ON public.jobs (status, run_at);

CREATE INDEX IF NOT EXISTS idx_jobs_type_status
  ON public.jobs (type, status);

CREATE INDEX IF NOT EXISTS idx_jobs_locked
  ON public.jobs (status, locked_at);

CREATE TABLE IF NOT EXISTS public.job_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL,
  attempt_number integer NOT NULL,
  worker_id text,
  error text,
  result jsonb,
  CONSTRAINT job_runs_status_check CHECK (status IN ('succeeded', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_job_runs_job_id
  ON public.job_runs (job_id, started_at DESC);

CREATE TABLE IF NOT EXISTS public.outbound_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid,
  lead_id uuid,
  appointment_id uuid,
  channel text NOT NULL,
  provider text NOT NULL,
  status text NOT NULL,
  idempotency_key text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  provider_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT outbound_attempts_channel_check CHECK (channel IN ('email', 'voice', 'sms')),
  CONSTRAINT outbound_attempts_status_check CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'suppressed'))
);

CREATE INDEX IF NOT EXISTS idx_outbound_attempts_idempotency
  ON public.outbound_attempts (idempotency_key);

CREATE INDEX IF NOT EXISTS idx_outbound_attempts_agent_created
  ON public.outbound_attempts (agent_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_id text NOT NULL,
  status text NOT NULL DEFAULT 'received',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  CONSTRAINT webhook_events_provider_check CHECK (provider IN ('vapi', 'telnyx')),
  CONSTRAINT webhook_events_status_check CHECK (status IN ('received', 'processed', 'failed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_provider_event
  ON public.webhook_events (provider, event_id);

CREATE INDEX IF NOT EXISTS idx_webhook_events_status
  ON public.webhook_events (provider, status, received_at DESC);

CREATE TABLE IF NOT EXISTS public.feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.feature_flags (key, enabled, updated_at)
VALUES
  ('email_enabled', true, now()),
  ('voice_enabled', true, now()),
  ('sms_enabled', false, now())
ON CONFLICT (key)
DO UPDATE SET
  enabled = EXCLUDED.enabled,
  updated_at = now();

COMMIT;
