-- Phase 5.0: AI listing chat + conversation summary

BEGIN;

ALTER TABLE public.ai_conversations
  ADD COLUMN IF NOT EXISTS agent_id uuid,
  ADD COLUMN IF NOT EXISTS visitor_id text,
  ADD COLUMN IF NOT EXISTS channel text DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS started_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz DEFAULT now();

UPDATE public.ai_conversations
SET
  agent_id = COALESCE(agent_id, user_id),
  visitor_id = COALESCE(visitor_id, NULLIF(TRIM(metadata->>'visitor_id'), '')),
  channel = COALESCE(NULLIF(TRIM(channel), ''), NULLIF(TRIM(metadata->>'channel'), ''), 'web'),
  started_at = COALESCE(started_at, created_at, now()),
  last_activity_at = COALESCE(last_activity_at, last_message_at, updated_at, created_at, now())
WHERE
  agent_id IS NULL
  OR visitor_id IS NULL
  OR channel IS NULL
  OR started_at IS NULL
  OR last_activity_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ai_conversations_agent_id
  ON public.ai_conversations(agent_id);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_visitor_listing
  ON public.ai_conversations(visitor_id, listing_id)
  WHERE visitor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_conversations_lead_id_updated_at
  ON public.ai_conversations(lead_id, updated_at DESC)
  WHERE lead_id IS NOT NULL;

ALTER TABLE public.ai_conversation_messages
  ADD COLUMN IF NOT EXISTS is_capture_event boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS intent_tags text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS confidence numeric;

CREATE INDEX IF NOT EXISTS idx_ai_conversation_messages_capture_event
  ON public.ai_conversation_messages(conversation_id, is_capture_event, created_at DESC);

CREATE TABLE IF NOT EXISTS public.lead_conversation_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL UNIQUE REFERENCES public.leads(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  summary_bullets text[] NOT NULL DEFAULT '{}'::text[],
  last_question text,
  intent_tags text[] NOT NULL DEFAULT '{}'::text[],
  timeline text,
  financing text,
  working_with_agent text,
  next_best_action text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_conversation_summaries_conversation_id
  ON public.lead_conversation_summaries(conversation_id);

CREATE INDEX IF NOT EXISTS idx_lead_conversation_summaries_updated_at
  ON public.lead_conversation_summaries(updated_at DESC);

COMMIT;
