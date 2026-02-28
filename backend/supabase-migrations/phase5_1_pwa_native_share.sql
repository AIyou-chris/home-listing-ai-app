-- Phase 5.1: PWA native video sharing (signed URLs + ownership)

BEGIN;

CREATE TABLE IF NOT EXISTS public.listing_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  listing_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  title text,
  caption text,
  storage_bucket text NOT NULL DEFAULT 'videos',
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL DEFAULT 'video/mp4',
  status text NOT NULL DEFAULT 'ready',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'listing_videos_storage_path_unique'
  ) THEN
    ALTER TABLE public.listing_videos
      ADD CONSTRAINT listing_videos_storage_path_unique UNIQUE (storage_path);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_listing_videos_listing_created
  ON public.listing_videos (listing_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listing_videos_agent_created
  ON public.listing_videos (agent_id, created_at DESC);

COMMIT;
