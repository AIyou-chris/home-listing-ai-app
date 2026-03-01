-- Phase 5.1.2: listing video credits + generation enforcement plumbing

BEGIN;

CREATE TABLE IF NOT EXISTS public.listing_video_credits (
  listing_id uuid PRIMARY KEY REFERENCES public.properties(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL,
  included_credits integer NOT NULL DEFAULT 0,
  extra_credits integer NOT NULL DEFAULT 0,
  used_credits integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'listing_video_credits_included_nonnegative'
  ) THEN
    ALTER TABLE public.listing_video_credits
      ADD CONSTRAINT listing_video_credits_included_nonnegative
      CHECK (included_credits >= 0)
      NOT VALID;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'listing_video_credits_extra_nonnegative'
  ) THEN
    ALTER TABLE public.listing_video_credits
      ADD CONSTRAINT listing_video_credits_extra_nonnegative
      CHECK (extra_credits >= 0)
      NOT VALID;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'listing_video_credits_used_nonnegative'
  ) THEN
    ALTER TABLE public.listing_video_credits
      ADD CONSTRAINT listing_video_credits_used_nonnegative
      CHECK (used_credits >= 0)
      NOT VALID;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_listing_video_credits_agent
  ON public.listing_video_credits (agent_id);

CREATE OR REPLACE FUNCTION public.reserve_listing_video_credit(
  p_listing_id uuid,
  p_agent_id uuid
)
RETURNS TABLE (
  listing_id uuid,
  agent_id uuid,
  included_credits integer,
  extra_credits integer,
  used_credits integer,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
AS $$
  UPDATE public.listing_video_credits
  SET
    used_credits = used_credits + 1,
    updated_at = now()
  WHERE listing_video_credits.listing_id = p_listing_id
    AND listing_video_credits.agent_id = p_agent_id
    AND (included_credits + extra_credits - used_credits) > 0
  RETURNING
    listing_video_credits.listing_id,
    listing_video_credits.agent_id,
    listing_video_credits.included_credits,
    listing_video_credits.extra_credits,
    listing_video_credits.used_credits,
    listing_video_credits.created_at,
    listing_video_credits.updated_at;
$$;

CREATE OR REPLACE FUNCTION public.add_listing_video_extra_credits(
  p_listing_id uuid,
  p_agent_id uuid,
  p_amount integer
)
RETURNS TABLE (
  listing_id uuid,
  agent_id uuid,
  included_credits integer,
  extra_credits integer,
  used_credits integer,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
AS $$
  UPDATE public.listing_video_credits
  SET
    extra_credits = extra_credits + GREATEST(p_amount, 0),
    updated_at = now()
  WHERE listing_video_credits.listing_id = p_listing_id
    AND listing_video_credits.agent_id = p_agent_id
  RETURNING
    listing_video_credits.listing_id,
    listing_video_credits.agent_id,
    listing_video_credits.included_credits,
    listing_video_credits.extra_credits,
    listing_video_credits.used_credits,
    listing_video_credits.created_at,
    listing_video_credits.updated_at;
$$;

CREATE OR REPLACE FUNCTION public.refund_listing_video_reserved_credit(
  p_listing_id uuid,
  p_agent_id uuid,
  p_amount integer
)
RETURNS TABLE (
  listing_id uuid,
  agent_id uuid,
  included_credits integer,
  extra_credits integer,
  used_credits integer,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
AS $$
  UPDATE public.listing_video_credits
  SET
    used_credits = GREATEST(used_credits - GREATEST(p_amount, 1), 0),
    updated_at = now()
  WHERE listing_video_credits.listing_id = p_listing_id
    AND listing_video_credits.agent_id = p_agent_id
  RETURNING
    listing_video_credits.listing_id,
    listing_video_credits.agent_id,
    listing_video_credits.included_credits,
    listing_video_credits.extra_credits,
    listing_video_credits.used_credits,
    listing_video_credits.created_at,
    listing_video_credits.updated_at;
$$;

ALTER TABLE public.listing_videos
  ADD COLUMN IF NOT EXISTS template_style text,
  ADD COLUMN IF NOT EXISTS duration_seconds integer,
  ADD COLUMN IF NOT EXISTS creatomate_template_id uuid,
  ADD COLUMN IF NOT EXISTS creatomate_render_id text,
  ADD COLUMN IF NOT EXISTS source_photos jsonb,
  ADD COLUMN IF NOT EXISTS error_message text;

ALTER TABLE public.listing_videos
  ALTER COLUMN template_style SET DEFAULT 'luxury',
  ALTER COLUMN duration_seconds SET DEFAULT 15,
  ALTER COLUMN status SET DEFAULT 'queued',
  ALTER COLUMN storage_bucket SET DEFAULT 'videos';

UPDATE public.listing_videos
SET
  template_style = COALESCE(NULLIF(template_style, ''), 'luxury'),
  duration_seconds = COALESCE(duration_seconds, 15),
  status = CASE
    WHEN status IS NULL OR btrim(status) = '' THEN 'queued'
    WHEN lower(status) IN ('ready', 'completed', 'published') THEN 'succeeded'
    ELSE lower(status)
  END,
  updated_at = now()
WHERE
  template_style IS NULL
  OR template_style = ''
  OR duration_seconds IS NULL
  OR status IS NULL
  OR btrim(status) = ''
  OR lower(status) IN ('ready', 'completed', 'published');

ALTER TABLE public.listing_videos
  ALTER COLUMN template_style SET NOT NULL,
  ALTER COLUMN duration_seconds SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN storage_bucket SET NOT NULL,
  ALTER COLUMN storage_path SET NOT NULL,
  ALTER COLUMN file_name SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'listing_videos_template_style_allowed'
  ) THEN
    ALTER TABLE public.listing_videos
      ADD CONSTRAINT listing_videos_template_style_allowed
      CHECK (template_style IN ('luxury', 'country', 'fixer', 'story'))
      NOT VALID;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'listing_videos_status_allowed_phase5_1_2'
  ) THEN
    ALTER TABLE public.listing_videos
      ADD CONSTRAINT listing_videos_status_allowed_phase5_1_2
      CHECK (status IN ('queued', 'rendering', 'succeeded', 'failed'))
      NOT VALID;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_listing_videos_agent_listing_created
  ON public.listing_videos (agent_id, listing_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listing_videos_listing_created_desc
  ON public.listing_videos (listing_id, created_at DESC);

COMMIT;
