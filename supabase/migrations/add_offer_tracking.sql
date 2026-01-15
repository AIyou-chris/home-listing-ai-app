-- Add column to track if the 48h offer has been sent
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS offer_sent_48h BOOLEAN DEFAULT FALSE;

-- Add index for performance on the scheduler query
CREATE INDEX IF NOT EXISTS idx_agents_offer_check 
ON agents (created_at, payment_status, offer_sent_48h);
