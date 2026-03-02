-- Phase 5.2.2
-- Ensure updated_at exists and auto-updates on every appointment update.

ALTER TABLE IF EXISTS public.appointments
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE public.appointments
SET updated_at = COALESCE(updated_at, now())
WHERE updated_at IS NULL;

ALTER TABLE IF EXISTS public.appointments
  ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE IF EXISTS public.appointments
  ALTER COLUMN updated_at SET NOT NULL;

CREATE OR REPLACE FUNCTION public.appointments_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointments_set_updated_at ON public.appointments;

CREATE TRIGGER trg_appointments_set_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.appointments_set_updated_at();

SELECT
  COUNT(*)::int AS total_rows,
  COUNT(*) FILTER (WHERE updated_at IS NOT NULL)::int AS with_updated_at
FROM public.appointments;
