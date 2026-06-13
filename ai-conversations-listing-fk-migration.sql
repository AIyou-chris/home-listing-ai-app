-- Fix: public-listing chat fails to start ("Chat is warming up").
-- ai_conversations.listing_id had a FK to the LEGACY `listings` table, but the
-- LO platform uses `properties.id` as listing_id everywhere. Public listings live
-- in `properties` (not `listings`), so every chat-session insert violated
-- ai_conversations_listing_id_fkey and degraded the chat.
--
-- Consistent with this project's app-controlled-integrity pattern (account_type
-- check + agent_invites.lo_agent_id FK were likewise dropped), drop the FK so
-- listing_id can reference a properties id. Integrity is enforced in app code.
-- Run in Supabase SQL Editor.

ALTER TABLE ai_conversations
  DROP CONSTRAINT IF EXISTS ai_conversations_listing_id_fkey;
