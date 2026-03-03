-- Phase 6.0: Listing editor brain source fields + updated_at trigger

BEGIN;

CREATE TABLE IF NOT EXISTS public.listing_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL,
  source_type text NOT NULL DEFAULT 'unknown',
  source_key text NOT NULL,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referrer_domain text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS public.listing_sources
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS url text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'needs_retrain',
  ADD COLUMN IF NOT EXISTS trained_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.listing_sources
SET
  type = COALESCE(
    NULLIF(type, ''),
    CASE
      WHEN lower(COALESCE(source_type, '')) IN ('text', 'doc', 'url') THEN lower(source_type)
      WHEN lower(COALESCE(source_type, '')) = 'link' THEN 'url'
      ELSE 'text'
    END
  ),
  title = COALESCE(NULLIF(title, ''), NULLIF(source_key, ''), NULLIF(source_type, ''), 'Source'),
  status = COALESCE(NULLIF(lower(status), ''), 'trained'),
  updated_at = COALESCE(updated_at, created_at, now());

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'listing_sources_status_check'
  ) THEN
    ALTER TABLE public.listing_sources
      ADD CONSTRAINT listing_sources_status_check
      CHECK (status IN ('trained', 'needs_retrain'));
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'listing_sources_listing_source_key_unique'
  ) THEN
    ALTER TABLE public.listing_sources
      ADD CONSTRAINT listing_sources_listing_source_key_unique UNIQUE (listing_id, source_key);
  END IF;
END$$;

CREATE OR REPLACE FUNCTION public.listing_sources_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_listing_sources_set_updated_at ON public.listing_sources;

CREATE TRIGGER trg_listing_sources_set_updated_at
BEFORE UPDATE ON public.listing_sources
FOR EACH ROW
EXECUTE FUNCTION public.listing_sources_set_updated_at();

COMMIT;
