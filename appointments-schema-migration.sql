-- Fix appointments table: drop overly-restrictive check constraints that block
-- lowercase status values and additional kind/status values used by the backend.
-- The backend normalises status to lowercase ('scheduled', 'confirmed', etc.)
-- and the original CHECK expected capitalised ('Scheduled', 'Completed', 'Cancelled').

-- 1. Drop old status check constraint (name may vary; try both Postgres default names)
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_status_check1;

-- 2. Drop old kind check constraint
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_kind_check;

ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_kind_check1;

-- 3. Add new, inclusive status constraint (all values the backend can produce)
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_status_check
  CHECK (status IN (
    'scheduled', 'confirmed', 'reschedule_requested', 'canceled', 'cancelled',
    'completed', 'no_show',
    -- Legacy capitalised values (existing rows in DB)
    'Scheduled', 'Confirmed', 'Completed', 'Cancelled', 'Canceled'
  ));

-- 4. Add new inclusive kind constraint
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_kind_check
  CHECK (kind IN (
    'Showing', 'Consultation', 'Open House', 'Virtual Tour', 'Follow-up',
    'showing', 'consultation', 'open_house', 'virtual_tour', 'follow_up',
    'Call', 'call', 'Other', 'other'
  ));

-- 5. Update default to lowercase to match backend inserts
ALTER TABLE public.appointments
  ALTER COLUMN status SET DEFAULT 'scheduled';

-- 6. Ensure new columns added by backend exist (idempotent)
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS agent_id UUID NULL,
  ADD COLUMN IF NOT EXISTS listing_id UUID NULL,
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS timezone TEXT NULL,
  ADD COLUMN IF NOT EXISTS location TEXT NULL,
  ADD COLUMN IF NOT EXISTS ics_token TEXT NULL,
  ADD COLUMN IF NOT EXISTS confirmation_status TEXT NULL,
  ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS last_reminder_outcome TEXT NULL,
  ADD COLUMN IF NOT EXISTS meet_link TEXT NULL;
