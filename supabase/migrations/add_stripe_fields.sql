-- Add Stripe Customer ID to agents table
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Ensure subscription_status exists and has correct constraints/defaults
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none';

-- Add index for faster lookups by customer ID (used by webhooks)
CREATE INDEX IF NOT EXISTS idx_agents_stripe_customer_id ON agents(stripe_customer_id);

-- Verify RLS policy allows service_role to update these fields
-- (Service Role usually bypasses RLS, but ensuring no strict blocks)
