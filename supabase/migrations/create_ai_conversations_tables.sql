-- AI Conversations Table
-- Groups messages into conversational threads (voice or chat)

CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL, -- Nullable for unknown callers
    title TEXT,
    contact_phone TEXT,
    status TEXT DEFAULT 'active', -- active, archived
    type TEXT DEFAULT 'voice', -- voice, chat
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Conversation Messages Table
-- Stores individual messages/transcripts within a conversation

CREATE TABLE IF NOT EXISTS public.ai_conversation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    sender TEXT NOT NULL, -- 'ai', 'user', 'system'
    channel TEXT DEFAULT 'voice', -- 'voice', 'chat', 'sms'
    content TEXT, -- The transcript or message body
    metadata JSONB DEFAULT '{}'::jsonb, -- Store recordingUrl, vapiCallId, tokens used, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON public.ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_lead ON public.ai_conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON public.ai_conversation_messages(conversation_id);

-- RLS
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversation_messages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own conversations" ON public.ai_conversations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations" ON public.ai_conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations" ON public.ai_conversations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view messages in their conversations" ON public.ai_conversation_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.ai_conversations
            WHERE id = ai_conversation_messages.conversation_id
            AND user_id = auth.uid()
        )
    );

-- Allow service role full access
CREATE POLICY "Service role full access conversations" ON public.ai_conversations
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access messages" ON public.ai_conversation_messages
    USING (auth.role() = 'service_role');
