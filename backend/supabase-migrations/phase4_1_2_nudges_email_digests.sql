-- Phase 4.1.2: Email nudges + daily digest notification settings

BEGIN;

CREATE TABLE IF NOT EXISTS public.agent_notification_settings (
  agent_id uuid PRIMARY KEY,
  email_enabled boolean NOT NULL DEFAULT true,
  daily_digest_enabled boolean NOT NULL DEFAULT false,
  unworked_lead_nudge_enabled boolean NOT NULL DEFAULT true,
  appt_confirm_nudge_enabled boolean NOT NULL DEFAULT true,
  reschedule_nudge_enabled boolean NOT NULL DEFAULT true,
  digest_time_local text NOT NULL DEFAULT '08:00',
  timezone text NOT NULL DEFAULT 'America/Los_Angeles',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agent_notification_settings_digest_time_check
    CHECK (digest_time_local ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$')
);

CREATE INDEX IF NOT EXISTS idx_agent_notification_settings_digest_enabled
  ON public.agent_notification_settings (daily_digest_enabled, email_enabled);

CREATE INDEX IF NOT EXISTS idx_agent_notification_settings_timezone
  ON public.agent_notification_settings (timezone);

INSERT INTO public.agent_notification_settings (
  agent_id,
  email_enabled,
  daily_digest_enabled,
  unworked_lead_nudge_enabled,
  appt_confirm_nudge_enabled,
  reschedule_nudge_enabled,
  digest_time_local,
  timezone
)
SELECT
  a.id,
  true,
  false,
  true,
  true,
  true,
  '08:00',
  'America/Los_Angeles'
FROM public.agents a
ON CONFLICT (agent_id) DO NOTHING;

UPDATE public.agent_notification_settings
SET
  email_enabled = COALESCE(email_enabled, true),
  daily_digest_enabled = COALESCE(daily_digest_enabled, false),
  unworked_lead_nudge_enabled = COALESCE(unworked_lead_nudge_enabled, true),
  appt_confirm_nudge_enabled = COALESCE(appt_confirm_nudge_enabled, true),
  reschedule_nudge_enabled = COALESCE(reschedule_nudge_enabled, true),
  digest_time_local = COALESCE(NULLIF(digest_time_local, ''), '08:00'),
  timezone = COALESCE(NULLIF(timezone, ''), 'America/Los_Angeles'),
  updated_at = now()
WHERE
  email_enabled IS NULL
  OR daily_digest_enabled IS NULL
  OR unworked_lead_nudge_enabled IS NULL
  OR appt_confirm_nudge_enabled IS NULL
  OR reschedule_nudge_enabled IS NULL
  OR digest_time_local IS NULL
  OR digest_time_local = ''
  OR timezone IS NULL
  OR timezone = '';

COMMIT;
