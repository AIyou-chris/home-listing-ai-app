-- ============================================================
-- LO AI phone numbers (one per loan officer). Idempotent.
-- Ported from An AI You's phone_lines. lo_agent_id = agents.id (profile id).
-- ============================================================
CREATE TABLE IF NOT EXISTS lo_phone_lines (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lo_agent_id             UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  phone_number            TEXT,
  requested_area_code     TEXT,
  status                  TEXT NOT NULL DEFAULT 'searching',
  provisioning_error      TEXT,
  reserved_number         TEXT,
  reserved_monthly_cost   TEXT,
  reserved_currency       TEXT,
  reservation_expires_at  TIMESTAMPTZ,
  monthly_cost            TEXT,
  telnyx_reservation_id   TEXT,
  telnyx_order_id         TEXT,
  telnyx_phone_number_id  TEXT,
  telnyx_connection_id    TEXT,
  transfer_number         TEXT,
  tool_token              TEXT NOT NULL,
  is_mock                 BOOLEAN NOT NULL DEFAULT FALSE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at            TIMESTAMPTZ,
  deactivated_at          TIMESTAMPTZ
);

DO $$ BEGIN
  ALTER TABLE lo_phone_lines ADD CONSTRAINT lo_phone_lines_status_check
    CHECK (status IN ('searching', 'ordering', 'configuring', 'active', 'failed', 'deactivated', 'released'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- One live line per LO: two quick clicks can never buy two numbers.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_lo_phone_lines_live
  ON lo_phone_lines (lo_agent_id) WHERE status IN ('searching', 'ordering', 'configuring', 'active', 'failed');
CREATE UNIQUE INDEX IF NOT EXISTS uniq_lo_phone_lines_number
  ON lo_phone_lines (phone_number) WHERE phone_number IS NOT NULL AND is_mock = FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_lo_phone_lines_tool_token ON lo_phone_lines (tool_token);
CREATE INDEX IF NOT EXISTS idx_lo_phone_lines_number_status ON lo_phone_lines (phone_number, status);

ALTER TABLE lo_phone_lines ENABLE ROW LEVEL SECURITY;
-- Backend uses the service role; no public policies.
