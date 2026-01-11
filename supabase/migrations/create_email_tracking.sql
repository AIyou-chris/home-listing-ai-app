-- Email Tracking Events Table
-- Tracks opens, clicks, and bounces for funnel emails

CREATE TABLE IF NOT EXISTS email_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  lead_id UUID NOT NULL,
  
  -- Funnel context
  funnel_type TEXT,
  step_id TEXT,
  message_id TEXT UNIQUE NOT NULL,
  
  -- Event timestamps
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  bounced_at TIMESTAMP WITH TIME ZONE,
  bounce_reason TEXT,
  
  -- Email details
  subject TEXT,
  recipient_email TEXT NOT NULL,
  
  -- Engagement counts
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_tracking_lead ON email_tracking_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_message ON email_tracking_events(message_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_user ON email_tracking_events(user_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_funnel ON email_tracking_events(funnel_type);
CREATE INDEX IF NOT EXISTS idx_email_tracking_sent ON email_tracking_events(sent_at DESC);

-- Enable Row Level Security
ALTER TABLE email_tracking_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own tracking events
CREATE POLICY email_tracking_user_policy ON email_tracking_events
  FOR ALL
  USING (user_id = auth.uid());

-- Comments
COMMENT ON TABLE email_tracking_events IS 'Tracks email engagement metrics for funnel drip campaigns';
COMMENT ON COLUMN email_tracking_events.message_id IS 'Unique identifier for this email message';
COMMENT ON COLUMN email_tracking_events.open_count IS 'Number of times email was opened';
COMMENT ON COLUMN email_tracking_events.click_count IS 'Number of times links were clicked';
