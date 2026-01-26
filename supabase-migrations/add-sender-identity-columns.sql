-- Add identity and billing columns to agents table
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS sender_name TEXT;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS sender_email TEXT;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS sender_reply_to TEXT;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS voice_minutes_used INTEGER DEFAULT 0;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS voice_allowance_monthly INTEGER DEFAULT 60;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS sms_sent_monthly INTEGER DEFAULT 0;
