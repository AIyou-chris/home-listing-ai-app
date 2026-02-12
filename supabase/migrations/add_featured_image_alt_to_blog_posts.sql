-- Add featured_image_alt column to blog_posts table
ALTER TABLE IF EXISTS public.blog_posts 
ADD COLUMN IF NOT EXISTS featured_image_alt text;
