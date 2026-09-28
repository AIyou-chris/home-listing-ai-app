-- ============================================================
-- LO Brain: Calls & Texts settings (idempotent, safe to re-run).
-- Voice is OpenAI (Realtime / gpt-4o-mini-tts); phone line + SMS carrier is Telnyx.
-- ============================================================
ALTER TABLE lo_chatbot_configs ADD COLUMN IF NOT EXISTS voice_name TEXT NOT NULL DEFAULT 'marin';
ALTER TABLE lo_chatbot_configs ADD COLUMN IF NOT EXISTS voice_style TEXT;
ALTER TABLE lo_chatbot_configs ADD COLUMN IF NOT EXISTS calls_mode TEXT NOT NULL DEFAULT 'off';
ALTER TABLE lo_chatbot_configs ADD COLUMN IF NOT EXISTS texts_mode TEXT NOT NULL DEFAULT 'ask';
ALTER TABLE lo_chatbot_configs ADD COLUMN IF NOT EXISTS call_opening TEXT;
ALTER TABLE lo_chatbot_configs ADD COLUMN IF NOT EXISTS voicemail_message TEXT;
ALTER TABLE lo_chatbot_configs ADD COLUMN IF NOT EXISTS sms_followup_template TEXT;
ALTER TABLE lo_chatbot_configs ADD COLUMN IF NOT EXISTS sms_reminder_template TEXT;

DO $$ BEGIN
  ALTER TABLE lo_chatbot_configs ADD CONSTRAINT lo_chatbot_configs_calls_mode_chk CHECK (calls_mode IN ('off', 'ask', 'auto'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE lo_chatbot_configs ADD CONSTRAINT lo_chatbot_configs_texts_mode_chk CHECK (texts_mode IN ('off', 'ask', 'auto'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
