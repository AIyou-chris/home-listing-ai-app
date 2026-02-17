
-- Run this in your Supabase SQL Editor to enable saving extra funnel step details

-- 1. Add description column if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'funnel_steps' AND column_name = 'description') THEN
        ALTER TABLE funnel_steps ADD COLUMN description TEXT;
    END IF;
END $$;

-- 2. Add preview_text column if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'funnel_steps' AND column_name = 'preview_text') THEN
        ALTER TABLE funnel_steps ADD COLUMN preview_text TEXT;
    END IF;
END $$;
