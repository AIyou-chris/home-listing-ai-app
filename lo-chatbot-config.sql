-- ============================================================
-- LO AI Chatbot Config
-- Run once in Supabase SQL editor
-- ============================================================

CREATE TABLE IF NOT EXISTS lo_chatbot_configs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lo_agent_id     UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  bot_name        TEXT NOT NULL DEFAULT 'Your Loan Officer',
  greeting        TEXT NOT NULL DEFAULT 'Hi! I can answer your financing and mortgage questions. What would you like to know?',
  personality     TEXT NOT NULL DEFAULT 'Professional, friendly, and knowledgeable mortgage advisor. Keep answers clear and concise. Always encourage the visitor to reach out directly for personalized numbers.',
  knowledge_base  TEXT NOT NULL DEFAULT '',
  faq             JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lo_agent_id)
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_lo_chatbot_configs_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lo_chatbot_configs_updated_at ON lo_chatbot_configs;
CREATE TRIGGER trg_lo_chatbot_configs_updated_at
  BEFORE UPDATE ON lo_chatbot_configs
  FOR EACH ROW EXECUTE FUNCTION update_lo_chatbot_configs_updated_at();

-- RLS
ALTER TABLE lo_chatbot_configs ENABLE ROW LEVEL SECURITY;

-- Public read (needed for visitor chat endpoint — backend uses service role so RLS not enforced there)
CREATE POLICY "lo_chatbot_configs_public_read" ON lo_chatbot_configs
  FOR SELECT USING (is_active = TRUE);
