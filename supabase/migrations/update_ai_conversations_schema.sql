-- Add missing columns to ai_conversations to match application requirements

ALTER TABLE public.ai_conversations
ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'agent',
ADD COLUMN IF NOT EXISTS listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS contact_name TEXT,
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS last_message TEXT,
ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS property TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS intent TEXT,
ADD COLUMN IF NOT EXISTS language TEXT,
ADD COLUMN IF NOT EXISTS voice_transcript TEXT,
ADD COLUMN IF NOT EXISTS follow_up_task TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for faster lookups on common filters
CREATE INDEX IF NOT EXISTS idx_ai_conversations_scope ON public.ai_conversations(scope);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_listing_id ON public.ai_conversations(listing_id);
