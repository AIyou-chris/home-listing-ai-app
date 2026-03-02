CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE IF EXISTS public.appointments
  ADD COLUMN IF NOT EXISTS ics_token text;

WITH token_backfill AS (
  UPDATE public.appointments
  SET ics_token = encode(gen_random_bytes(24), 'hex')
  WHERE ics_token IS NULL OR btrim(ics_token) = ''
  RETURNING id
)
SELECT count(*)::int AS updated_count FROM token_backfill;

ALTER TABLE IF EXISTS public.appointments
  ALTER COLUMN ics_token SET DEFAULT encode(gen_random_bytes(24), 'hex');

CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_ics_token_unique
  ON public.appointments (ics_token)
  WHERE ics_token IS NOT NULL;
