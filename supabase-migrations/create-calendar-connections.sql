-- Create google_calendar_connections table for unified OAuth storage
CREATE TABLE IF NOT EXISTS public.google_calendar_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE,
    email TEXT,
    access_token TEXT,
    refresh_token TEXT,
    expiry_date BIGINT,
    scope TEXT,
    token_type TEXT DEFAULT 'Bearer',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.google_calendar_connections ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view their own calendar connections" ON public.google_calendar_connections;
CREATE POLICY "Users can view their own calendar connections" ON public.google_calendar_connections
    FOR SELECT USING (auth.uid()::text = user_id OR user_id = 'demo-blueprint');

DROP POLICY IF EXISTS "Users can insert their own calendar connections" ON public.google_calendar_connections;
CREATE POLICY "Users can insert their own calendar connections" ON public.google_calendar_connections
    FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id = 'demo-blueprint');

DROP POLICY IF EXISTS "Users can update their own calendar connections" ON public.google_calendar_connections;
CREATE POLICY "Users can update their own calendar connections" ON public.google_calendar_connections
    FOR UPDATE USING (auth.uid()::text = user_id OR user_id = 'demo-blueprint');

DROP POLICY IF EXISTS "Users can delete their own calendar connections" ON public.google_calendar_connections;
CREATE POLICY "Users can delete their own calendar connections" ON public.google_calendar_connections
    FOR DELETE USING (auth.uid()::text = user_id OR user_id = 'demo-blueprint');
