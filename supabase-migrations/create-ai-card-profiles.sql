-- ============================================================================
-- Create AI Card Profiles Table
-- Stores the profile data for the AI Business Card
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_card_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  professional_title TEXT,
  company TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  bio TEXT,
  brand_color TEXT,
  social_media JSONB DEFAULT '{}'::jsonb,
  headshot_url TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.ai_card_profiles ENABLE ROW LEVEL SECURITY;

-- Policies

-- Public Read Access (AI Cards are public)
CREATE POLICY "Public can view all AI Card profiles" ON public.ai_card_profiles
  FOR SELECT USING (true);

-- User Write Access (Users can manage their own profile)
CREATE POLICY "Users can insert their own AI Card profile" ON public.ai_card_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI Card profile" ON public.ai_card_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Service Role Access (Admin/Backend)
-- Implicitly has full access, but explicit policies can be added if needed.
-- Usually service_role bypasses RLS.

-- Add comment
COMMENT ON TABLE public.ai_card_profiles IS 'Stores AI Business Card profile data for agents';
