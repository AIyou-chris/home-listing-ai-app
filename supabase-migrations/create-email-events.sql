-- Create email_events table for tracking Mailgun events
CREATE TABLE IF NOT EXISTS email_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'delivered', 'opened', 'clicked', 'complained', 'bounced'
    recipient TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    campaign_id TEXT, -- e.g., 'welcome-step-1'
    user_id TEXT, -- Agent ID
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own email events"
    ON email_events FOR SELECT
    USING (auth.uid()::text = user_id OR user_id = 'demo-blueprint');

CREATE POLICY "Service role can insert events"
    ON email_events FOR INSERT
    WITH CHECK (true); -- Webhook handler (service role) needs to insert

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_events_message_id ON email_events(message_id);
CREATE INDEX IF NOT EXISTS idx_email_events_campaign_id ON email_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_events_user_id ON email_events(user_id);
