-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    type TEXT DEFAULT 'info', -- 'info', 'success', 'warning', 'error', 'broadcast'
    priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    is_read BOOLEAN DEFAULT false,
    link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own notifications"
    ON public.notifications
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON public.notifications
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Allow users to insert (for testing/client-side generation if needed, mostly backend likely)
CREATE POLICY "Users can insert their own notifications"
    ON public.notifications
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);
