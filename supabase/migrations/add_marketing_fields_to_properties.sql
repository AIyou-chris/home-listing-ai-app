-- Add marketing fields to properties table
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS cta_listing_url TEXT,
ADD COLUMN IF NOT EXISTS cta_media_url TEXT,
ADD COLUMN IF NOT EXISTS app_features JSONB DEFAULT '{}'::jsonb;
