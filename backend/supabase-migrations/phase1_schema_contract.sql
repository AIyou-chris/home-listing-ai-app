-- Phase 1 schema contract hardening
-- Keeps runtime expectations aligned with backend/server.cjs and scheduler service.

BEGIN;

-- 1) Email tracking status used by webhook/tracking analytics paths.
ALTER TABLE IF EXISTS public.email_tracking_events
    ADD COLUMN IF NOT EXISTS status text;

ALTER TABLE IF EXISTS public.email_tracking_events
    ALTER COLUMN status SET DEFAULT 'sent';

UPDATE public.email_tracking_events
SET status = CASE
    WHEN COALESCE(click_count, 0) > 0 OR clicked_at IS NOT NULL THEN 'clicked'
    WHEN COALESCE(open_count, 0) > 0 OR opened_at IS NOT NULL THEN 'opened'
    ELSE 'sent'
END
WHERE status IS NULL;

-- 2) Agent metadata used by scheduler trial engagement state.
ALTER TABLE IF EXISTS public.agents
    ADD COLUMN IF NOT EXISTS metadata jsonb;

UPDATE public.agents
SET metadata = '{}'::jsonb
WHERE metadata IS NULL;

ALTER TABLE IF EXISTS public.agents
    ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS public.agents
    ALTER COLUMN metadata SET NOT NULL;

COMMIT;
