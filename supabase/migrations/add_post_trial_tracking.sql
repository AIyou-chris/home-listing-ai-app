-- Add tracking flags for trial emails
-- This ensures we don't send duplicate emails to the same user

ALTER TABLE public.agents 
ADD COLUMN IF NOT EXISTS trial_warning_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS recovery_email_sent boolean DEFAULT false;

-- Comment on columns for clarity
COMMENT ON COLUMN public.agents.trial_warning_sent IS 'True if the 3-day trial warning email has been sent';
COMMENT ON COLUMN public.agents.recovery_email_sent IS 'True if the post-trial recovery email has been sent';
