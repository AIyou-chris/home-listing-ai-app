-- Phase 4.0: onboarding state for launch checklist flow

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS onboarding_checklist JSONB DEFAULT '{
    "brand_profile": false,
    "first_listing_created": false,
    "first_listing_published": false,
    "share_kit_copied": false,
    "test_lead_sent": false,
    "first_appointment_created": false,
    "first_listing_id": null,
    "last_test_lead_id": null
  }'::jsonb;

UPDATE agents
SET
  onboarding_completed = COALESCE(onboarding_completed, FALSE),
  onboarding_step = COALESCE(onboarding_step, 0),
  onboarding_checklist = COALESCE(
    onboarding_checklist,
    '{
      "brand_profile": false,
      "first_listing_created": false,
      "first_listing_published": false,
      "share_kit_copied": false,
      "test_lead_sent": false,
      "first_appointment_created": false,
      "first_listing_id": null,
      "last_test_lead_id": null
    }'::jsonb
  )
WHERE onboarding_completed IS NULL
   OR onboarding_step IS NULL
   OR onboarding_checklist IS NULL;

CREATE INDEX IF NOT EXISTS idx_agents_onboarding_completed
  ON agents (onboarding_completed);
