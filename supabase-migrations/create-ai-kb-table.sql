-- Create AI Knowledge Base Table
CREATE TABLE IF NOT EXISTS public.ai_kb (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    sidekick TEXT NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('file', 'text', 'url')),
    content TEXT,
    file_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_kb ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view their own KB entries" ON public.ai_kb;
CREATE POLICY "Users can view their own KB entries" ON public.ai_kb
    FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can insert their own KB entries" ON public.ai_kb;
CREATE POLICY "Users can insert their own KB entries" ON public.ai_kb
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete their own KB entries" ON public.ai_kb;
CREATE POLICY "Users can delete their own KB entries" ON public.ai_kb
    FOR DELETE USING (auth.uid()::text = user_id);
