-- Create the 'ai-kb' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('ai-kb', 'ai-kb', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow public read access to ai-kb bucket
DROP POLICY IF EXISTS "Public can view ai-kb" ON storage.objects;
CREATE POLICY "Public can view ai-kb" ON storage.objects
  FOR SELECT USING (bucket_id = 'ai-kb');

-- Allow authenticated users to upload files to ai-kb bucket
DROP POLICY IF EXISTS "Authenticated can upload to ai-kb" ON storage.objects;
CREATE POLICY "Authenticated can upload to ai-kb" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'ai-kb' 
    AND auth.role() = 'authenticated'
  );

-- Allow users to update their own files in ai-kb
DROP POLICY IF EXISTS "Users can update own ai-kb files" ON storage.objects;
CREATE POLICY "Users can update own ai-kb files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'ai-kb' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to delete their own files in ai-kb
DROP POLICY IF EXISTS "Users can delete own ai-kb files" ON storage.objects;
CREATE POLICY "Users can delete own ai-kb files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'ai-kb' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
