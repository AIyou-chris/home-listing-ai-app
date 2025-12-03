-- MASTER FIX for AI Card
-- Run this entire script to fix all upload and save issues.

-- 1. Remove Foreign Key constraint (allows Demo User to save)
ALTER TABLE public.ai_card_profiles
DROP CONSTRAINT IF EXISTS ai_card_profiles_user_id_fkey;

-- 2. Make columns nullable (allows partial saves and uploads)
ALTER TABLE public.ai_card_profiles
ALTER COLUMN professional_title DROP NOT NULL,
ALTER COLUMN company DROP NOT NULL,
ALTER COLUMN phone DROP NOT NULL,
ALTER COLUMN email DROP NOT NULL,
ALTER COLUMN website DROP NOT NULL,
ALTER COLUMN bio DROP NOT NULL,
ALTER COLUMN brand_color DROP NOT NULL;

-- 3. Ensure Storage Bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('ai-card-assets', 'ai-card-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Ensure Storage Policies exist
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
