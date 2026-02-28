-- Phase 5.1.1: enforce canonical listing_videos bucket/path convention

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'listing_videos_bucket_videos_only'
  ) THEN
    ALTER TABLE public.listing_videos
      ADD CONSTRAINT listing_videos_bucket_videos_only
      CHECK (storage_bucket = 'videos')
      NOT VALID;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'listing_videos_storage_path_canonical'
  ) THEN
    ALTER TABLE public.listing_videos
      ADD CONSTRAINT listing_videos_storage_path_canonical
      CHECK (
        storage_path = (
          'agent/' || agent_id::text || '/listing/' || listing_id::text || '/' || id::text || '.mp4'
        )
      )
      NOT VALID;
  END IF;
END$$;

COMMIT;
