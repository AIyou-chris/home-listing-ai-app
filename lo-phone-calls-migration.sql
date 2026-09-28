-- ============================================================
-- LO AI phone calls: every call to an LO's AI number. Idempotent.
-- lo_agent_id = agents.id (profile id). One row per inbound call.
-- ============================================================
CREATE TABLE IF NOT EXISTS lo_phone_calls (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lo_agent_id              UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  line_id                  UUID REFERENCES lo_phone_lines(id) ON DELETE SET NULL,
  telnyx_call_control_id   TEXT NOT NULL,
  openai_call_id           TEXT,
  from_number              TEXT,
  to_number                TEXT,
  mode                     TEXT NOT NULL DEFAULT 'ai',      -- ai | forward | unavailable
  status                   TEXT NOT NULL DEFAULT 'ringing', -- ringing | ai_live | transferred | completed | failed
  transcript               JSONB NOT NULL DEFAULT '[]'::jsonb,
  caller_details           JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary                  TEXT,
  intent_level             TEXT,
  handoff_requested        BOOLEAN NOT NULL DEFAULT FALSE,
  transferred_to           TEXT,
  lead_id                  UUID,
  hangup_cause             TEXT,
  error                    TEXT,
  started_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  answered_at              TIMESTAMPTZ,
  ended_at                 TIMESTAMPTZ,
  finalized_at             TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Telnyx retries webhooks: one row per call, ever.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_lo_phone_calls_telnyx ON lo_phone_calls (telnyx_call_control_id);
CREATE INDEX IF NOT EXISTS idx_lo_phone_calls_lo_started ON lo_phone_calls (lo_agent_id, started_at DESC);

ALTER TABLE lo_phone_calls ENABLE ROW LEVEL SECURITY;
-- Backend uses the service role; no public policies.

-- Where hot callers get passed to (falls back to agents.phone).
ALTER TABLE lo_phone_lines ADD COLUMN IF NOT EXISTS transfer_number TEXT;
