-- ============================================================================
-- Agent Profile Enhancement Migration
-- Adds profile fields to agents table for dashboard personalization
-- ============================================================================

-- Add profile columns to agents table
ALTER TABLE public.agents 
  ADD COLUMN IF NOT EXISTS headshot_url TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS company TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT;

-- Add index for faster queries by auth_user_id
CREATE INDEX IF NOT EXISTS idx_agents_auth_user_id ON public.agents(auth_user_id);

-- Add comment for documentation
COMMENT ON COLUMN public.agents.headshot_url IS 'URL to agent headshot photo (Supabase Storage or external)';
COMMENT ON COLUMN public.agents.phone IS 'Agent phone number';
COMMENT ON COLUMN public.agents.company IS 'Agent company/brokerage name';
COMMENT ON COLUMN public.agents.title IS 'Agent job title (e.g., "Luxury Real Estate Specialist")';
COMMENT ON COLUMN public.agents.bio IS 'Agent biography/about text';
COMMENT ON COLUMN public.agents.website IS 'Agent personal website URL';

-- ============================================================================
-- NOTES:
-- - Run this migration AFTER creating the agents table from agent-onboarding-flow.md
-- - headshot_url can point to Supabase Storage or an external CDN
-- - These fields override AI Card profile data when present
-- - Dashboard will display: first_name + last_name as agent name
-- - Future: Add storage bucket for agent headshots if needed
-- ============================================================================
