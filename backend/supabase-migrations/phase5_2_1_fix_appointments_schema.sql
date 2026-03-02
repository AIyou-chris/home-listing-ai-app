-- Phase 5.2.1 Checkpoint A
-- Align appointments table with current create/update flow fields.

ALTER TABLE IF EXISTS public.appointments
  ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE IF EXISTS public.appointments
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE IF EXISTS public.appointments
  ADD COLUMN IF NOT EXISTS agent_id uuid;

ALTER TABLE IF EXISTS public.appointments
  ADD COLUMN IF NOT EXISTS listing_id uuid;

ALTER TABLE IF EXISTS public.appointments
  ADD COLUMN IF NOT EXISTS property_address text;

ALTER TABLE IF EXISTS public.appointments
  ADD COLUMN IF NOT EXISTS starts_at timestamptz;

ALTER TABLE IF EXISTS public.appointments
  ADD COLUMN IF NOT EXISTS ends_at timestamptz;

ALTER TABLE IF EXISTS public.appointments
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/Los_Angeles';

ALTER TABLE IF EXISTS public.appointments
  ADD COLUMN IF NOT EXISTS location text;

ALTER TABLE IF EXISTS public.appointments
  ADD COLUMN IF NOT EXISTS confirmation_status text DEFAULT 'needs_confirmation';

ALTER TABLE IF EXISTS public.appointments
  ADD COLUMN IF NOT EXISTS remind_agent boolean DEFAULT true;

ALTER TABLE IF EXISTS public.appointments
  ADD COLUMN IF NOT EXISTS remind_client boolean DEFAULT true;

ALTER TABLE IF EXISTS public.appointments
  ADD COLUMN IF NOT EXISTS agent_reminder_minutes_before integer DEFAULT 60;

ALTER TABLE IF EXISTS public.appointments
  ADD COLUMN IF NOT EXISTS client_reminder_minutes_before integer DEFAULT 60;

UPDATE public.appointments
SET
  created_at = COALESCE(created_at, now()),
  updated_at = COALESCE(updated_at, now()),
  starts_at = COALESCE(starts_at, start_iso),
  ends_at = COALESCE(ends_at, CASE WHEN end_iso ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T' THEN end_iso::timestamptz ELSE NULL END),
  timezone = COALESCE(NULLIF(timezone, ''), 'America/Los_Angeles'),
  confirmation_status = COALESCE(NULLIF(confirmation_status, ''), 'needs_confirmation'),
  remind_agent = COALESCE(remind_agent, true),
  remind_client = COALESCE(remind_client, true),
  agent_reminder_minutes_before = COALESCE(agent_reminder_minutes_before, 60),
  client_reminder_minutes_before = COALESCE(client_reminder_minutes_before, 60)
WHERE
  created_at IS NULL
  OR updated_at IS NULL
  OR starts_at IS NULL
  OR timezone IS NULL
  OR timezone = ''
  OR confirmation_status IS NULL
  OR confirmation_status = ''
  OR remind_agent IS NULL
  OR remind_client IS NULL
  OR agent_reminder_minutes_before IS NULL
  OR client_reminder_minutes_before IS NULL;

SELECT
  COUNT(*)::int AS appointment_rows,
  COUNT(*) FILTER (WHERE updated_at IS NOT NULL)::int AS with_updated_at,
  COUNT(*) FILTER (WHERE starts_at IS NOT NULL)::int AS with_starts_at
FROM public.appointments;
