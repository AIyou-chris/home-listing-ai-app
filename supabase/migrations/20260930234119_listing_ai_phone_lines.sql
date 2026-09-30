-- A dedicated AI number for each assigned property. Existing LO numbers stay
-- as general lines (listing_id NULL). Only the backend service role reads rows.
ALTER TABLE lo_phone_lines
  ADD COLUMN IF NOT EXISTS listing_id UUID;

DROP INDEX IF EXISTS uniq_lo_phone_lines_live;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_lo_phone_lines_general_live
  ON lo_phone_lines (lo_agent_id)
  WHERE listing_id IS NULL AND status IN ('searching', 'ordering', 'configuring', 'active', 'failed');
CREATE UNIQUE INDEX IF NOT EXISTS uniq_lo_phone_lines_listing_live
  ON lo_phone_lines (listing_id)
  WHERE listing_id IS NOT NULL AND status IN ('searching', 'ordering', 'configuring', 'active', 'failed');
CREATE INDEX IF NOT EXISTS idx_lo_phone_lines_listing ON lo_phone_lines (listing_id);

ALTER TABLE lo_phone_calls
  ADD COLUMN IF NOT EXISTS listing_id UUID;
CREATE INDEX IF NOT EXISTS idx_lo_phone_calls_listing_started
  ON lo_phone_calls (listing_id, started_at DESC);
