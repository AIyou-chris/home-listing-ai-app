-- Allow Admins to read all conversations
-- Relies on 'claims_admin' metadata set by grant_admin_access.sql

CREATE POLICY "Admins can view all conversations"
    ON public.ai_conversations
    FOR SELECT
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'claims_admin')::boolean = true
    );

CREATE POLICY "Admins can view all conversation messages"
    ON public.ai_conversation_messages
    FOR SELECT
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'claims_admin')::boolean = true
    );
