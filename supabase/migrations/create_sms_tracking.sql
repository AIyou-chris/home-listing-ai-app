-- SMS Tracking Events Table
-- Tracks delivery status and failures for funnel SMS messages

CREATE TABLE IF NOT EXISTS sms_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  lead_id UUID NOT NULL,
  
  -- Funnel context
  funnel_type TEXT,
  step_id TEXT,
  message_sid TEXT UNIQUE NOT NULL, -- Twilio/provider message ID
  
  -- Event timestamps
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT,
  
  -- SMS details
  recipient_phone TEXT NOT NULL,
  message_body TEXT,
  provider TEXT DEFAULT 'twilio', -- twilio, bandwidth, etc.
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sms_tracking_lead ON sms_tracking_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_sms_tracking_message ON sms_tracking_events(message_sid);
CREATE INDEX IF NOT EXISTS idx_sms_tracking_user ON sms_tracking_events(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_tracking_funnel ON sms_tracking_events(funnel_type);
CREATE INDEX IF NOT EXISTS idx_sms_tracking_sent ON sms_tracking_events(sent_at DESC);

-- Enable Row Level Security
ALTER TABLE sms_tracking_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own tracking events
CREATE POLICY sms_tracking_user_policy ON sms_tracking_events
  FOR ALL
  USING (user_id = auth.uid());

-- Comments
COMMENT ON TABLE sms_tracking_events IS 'Tracks SMS delivery and engagement metrics for funnel drip campaigns';
COMMENT ON COLUMN sms_tracking_events.message_sid IS 'Unique identifier from SMS provider (e.g. Twilio MessageSid)';
COMMENT ON COLUMN sms_tracking_events.failure_reason IS 'Error code or reason if SMS failed to deliver';
