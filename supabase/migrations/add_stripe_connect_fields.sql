-- Add Stripe Connect Account ID to agents table
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS stripe_connect_id TEXT;

-- Add index for lookups
CREATE INDEX IF NOT EXISTS idx_agents_stripe_connect_id ON agents(stripe_connect_id);

-- Add updated_at if not exists (good practice for syncs)
-- ALTER TABLE agents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
