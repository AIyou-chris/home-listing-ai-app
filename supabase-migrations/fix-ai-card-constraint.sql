-- Remove Foreign Key constraint from ai_card_profiles
-- This allows the 'demo' user (DEFAULT_LEAD_USER_ID) to have a profile even if they don't exist in auth.users

ALTER TABLE public.ai_card_profiles
DROP CONSTRAINT IF EXISTS ai_card_profiles_user_id_fkey;

-- Ensure the bucket exists (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('ai-card-assets', 'ai-card-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Ensure policies exist (idempotent-ish, dropping first to be safe)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'ai-card-assets');

DROP POLICY IF EXISTS "Authenticated Uploads" ON storage.objects;
CREATE POLICY "Authenticated Uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'ai-card-assets' AND auth.role() = 'authenticated');
