-- Optional (run once in the Supabase SQL editor; safe to run twice).
-- The buyer chat now saves fine WITHOUT these columns (it skips any column the table lacks).
-- Adding them lets the app also store each message's intent tags, a capture flag and a confidence
-- score, and tracks which visitor and channel a conversation came from.

ALTER TABLE ai_conversation_messages
  ADD COLUMN IF NOT EXISTS is_capture_event boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS intent_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS confidence numeric;

ALTER TABLE ai_conversations
  ADD COLUMN IF NOT EXISTS agent_id uuid,
  ADD COLUMN IF NOT EXISTS visitor_id text,
  ADD COLUMN IF NOT EXISTS channel text,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz,
  ADD COLUMN IF NOT EXISTS started_at timestamptz;

CREATE INDEX IF NOT EXISTS ai_conversations_visitor_idx ON ai_conversations (visitor_id);
CREATE INDEX IF NOT EXISTS ai_conversation_messages_conv_idx ON ai_conversation_messages (conversation_id, created_at);
