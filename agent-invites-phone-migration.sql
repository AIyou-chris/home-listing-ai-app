-- Add optional phone to agent_invites so LOs can call/text a pending agent
-- straight from the Partners dashboard. Captured at invite time, optional.
ALTER TABLE agent_invites ADD COLUMN IF NOT EXISTS invited_phone TEXT;
