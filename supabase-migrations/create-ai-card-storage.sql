-- Create AI Card Profiles Table
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

-- Enable RLS
ALTER TABLE public.ai_card_profiles ENABLE ROW LEVEL SECURITY;

-- Policies for Table
DROP POLICY IF EXISTS "Public can view all AI Card profiles" ON public.ai_card_profiles;
CREATE POLICY "Public can view all AI Card profiles" ON public.ai_card_profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own AI Card profile" ON public.ai_card_profiles;
CREATE POLICY "Users can insert their own AI Card profile" ON public.ai_card_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own AI Card profile" ON public.ai_card_profiles;
CREATE POLICY "Users can update their own AI Card profile" ON public.ai_card_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Create Storage Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('ai-card-assets', 'ai-card-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'ai-card-assets');

DROP POLICY IF EXISTS "Authenticated Uploads" ON storage.objects;
CREATE POLICY "Authenticated Uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'ai-card-assets' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own assets" ON storage.objects;
CREATE POLICY "Users can update their own assets" ON storage.objects
  FOR UPDATE USING (bucket_id = 'ai-card-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own assets" ON storage.objects;
CREATE POLICY "Users can delete their own assets" ON storage.objects
  FOR DELETE USING (bucket_id = 'ai-card-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
