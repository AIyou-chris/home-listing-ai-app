-- ============================================================
-- Per-listing AI phone numbers. Idempotent.
-- A listing line is a lo_phone_lines row with listing_id set (= properties.id).
-- The LO's main line keeps listing_id NULL. All calls share the LO's minute pool.
-- ============================================================
ALTER TABLE lo_phone_lines ADD COLUMN IF NOT EXISTS listing_id UUID;

-- Main line: still exactly one live line per LO (listing_id IS NULL).
DROP INDEX IF EXISTS uniq_lo_phone_lines_live;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_lo_phone_lines_live
  ON lo_phone_lines (lo_agent_id)
  WHERE listing_id IS NULL AND status IN ('searching', 'ordering', 'configuring', 'active', 'failed');

-- Listing line: exactly one live line per listing.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_lo_phone_lines_listing_live
  ON lo_phone_lines (listing_id)
  WHERE listing_id IS NOT NULL AND status IN ('searching', 'ordering', 'configuring', 'active', 'failed');

CREATE INDEX IF NOT EXISTS idx_lo_phone_lines_lo_listing ON lo_phone_lines (lo_agent_id, listing_id);
