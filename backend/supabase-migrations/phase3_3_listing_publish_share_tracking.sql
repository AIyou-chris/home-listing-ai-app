-- Phase 3.3: Listing publish/share kit/source attribution wiring

BEGIN;

ALTER TABLE IF EXISTS public.properties
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS public_slug text,
  ADD COLUMN IF NOT EXISTS share_url text,
  ADD COLUMN IF NOT EXISTS qr_code_url text,
  ADD COLUMN IF NOT EXISTS qr_code_svg text,
  ADD COLUMN IF NOT EXISTS open_house_mode_enabled boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_properties_public_slug_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_properties_public_slug_unique
      ON public.properties (public_slug)
      WHERE public_slug IS NOT NULL;
  END IF;
END$$;

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

CREATE INDEX IF NOT EXISTS idx_listing_sources_listing
  ON public.listing_sources (listing_id);

CREATE INDEX IF NOT EXISTS idx_listing_sources_agent
  ON public.listing_sources (agent_id);

ALTER TABLE IF EXISTS public.leads
  ADD COLUMN IF NOT EXISTS agent_id uuid,
  ADD COLUMN IF NOT EXISTS listing_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS phone_e164 text,
  ADD COLUMN IF NOT EXISTS email_lower text,
  ADD COLUMN IF NOT EXISTS consent_sms boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_timestamp timestamptz,
  ADD COLUMN IF NOT EXISTS financing text,
  ADD COLUMN IF NOT EXISTS working_with_agent text,
  ADD COLUMN IF NOT EXISTS last_message_preview text,
  ADD COLUMN IF NOT EXISTS last_message_at timestamptz,
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source_key text,
  ADD COLUMN IF NOT EXISTS source_meta jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS first_touch_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_touch_at timestamptz DEFAULT now();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name = 'listing_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_leads_listing_source
      ON public.leads (listing_id, source_type, source_key);
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.listing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  type text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_events_listing_created
  ON public.listing_events (listing_id, created_at DESC);

COMMIT;
