-- ============================================================================
-- Supabase Setup for Home Listing AI App
-- Run this SQL in your Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. CREATE TABLES
-- ============================================================================

-- AI Sidekick Profiles (agent-level and listing-level personas)
CREATE TABLE IF NOT EXISTS public.ai_sidekick_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('agent', 'listing', 'marketing', 'sales', 'support', 'helper', 'main', 'god')),
  listing_id TEXT NULL,
  display_name TEXT NULL,
  summary TEXT NULL,
  voice_label TEXT NULL,
  persona_preset TEXT NULL,
  description TEXT NULL,
  traits TEXT[] NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sidekick_profiles_user_id ON public.ai_sidekick_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_sidekick_profiles_listing ON public.ai_sidekick_profiles(user_id, listing_id) WHERE scope = 'listing';
CREATE INDEX IF NOT EXISTS idx_sidekick_profiles_scope ON public.ai_sidekick_profiles(user_id, scope);

-- AI Knowledge Base entries (user_id is TEXT to match existing table)
CREATE TABLE IF NOT EXISTS public.ai_kb (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  sidekick TEXT NOT NULL CHECK (sidekick IN ('main', 'sales', 'listing', 'agent', 'helper', 'marketing', 'support')),
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('file', 'text', 'url')),
  content TEXT NULL,
  file_path TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_kb_user_id ON public.ai_kb(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_kb_sidekick ON public.ai_kb(user_id, sidekick);

-- Audit logs (for backend privileged operations)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error')),
  details JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- AI usage tracking (monthly aggregation)
CREATE TABLE IF NOT EXISTS public.ai_usage_monthly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  date TEXT NOT NULL,
  requests INTEGER NOT NULL DEFAULT 0,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10, 4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role, date)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_monthly_user_id ON public.ai_usage_monthly(user_id);

-- Security alerts
CREATE TABLE IF NOT EXISTS public.security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolution TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_security_alerts_resolved ON public.security_alerts(resolved);

-- Backups manifest
CREATE TABLE IF NOT EXISTS public.backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type TEXT NOT NULL CHECK (backup_type IN ('manual', 'scheduled')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  file_path TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Appointments (agent <> client scheduling)
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID NULL,
  property_id TEXT NULL,
  property_address TEXT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('Showing', 'Consultation', 'Open House', 'Virtual Tour', 'Follow-up')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NULL,
  date DATE NOT NULL,
  time_label TEXT NOT NULL,
  start_iso TIMESTAMPTZ NOT NULL,
  end_iso TIMESTAMPTZ NOT NULL,
  meet_link TEXT NULL,
  notes TEXT NULL,
  status TEXT NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Completed', 'Cancelled')),
  remind_agent BOOLEAN NOT NULL DEFAULT TRUE,
  remind_client BOOLEAN NOT NULL DEFAULT TRUE,
  agent_reminder_minutes_before INTEGER NOT NULL DEFAULT 60,
  client_reminder_minutes_before INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON public.appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(user_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(user_id, status);

-- Leads
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NULL,
  phone TEXT NULL,
  status TEXT NOT NULL DEFAULT 'New',
  source TEXT NULL,
  notes TEXT NULL,
  last_message TEXT NULL,
  interested_properties TEXT[] NULL,
  score NUMERIC NULL,
  last_contact TIMESTAMPTZ NULL,
  active_sequences TEXT[] NULL,
  funnel_type TEXT NULL CHECK (funnel_type IN ('homebuyer','seller','postShowing')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_user_id ON public.leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(user_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(user_id, created_at DESC);
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS funnel_type TEXT
  CHECK (funnel_type IS NULL OR funnel_type IN ('homebuyer','seller','postShowing'));
CREATE INDEX IF NOT EXISTS idx_leads_funnel_type ON public.leads(user_id, funnel_type);

-- Lead phone logs
CREATE TABLE IF NOT EXISTS public.lead_phone_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  call_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  call_outcome TEXT NOT NULL CHECK (call_outcome IN ('connected', 'voicemail', 'no_answer', 'busy', 'other')),
  call_notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_logs_lead_id ON public.lead_phone_logs(lead_id, call_started_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_logs_user_id ON public.lead_phone_logs(user_id);

-- AI Card Profiles (agent digital business card)
CREATE TABLE IF NOT EXISTS public.ai_card_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  professional_title TEXT NOT NULL,
  company TEXT NULL,
  phone TEXT NULL,
  email TEXT NULL,
  website TEXT NULL,
  bio TEXT NULL,
  brand_color TEXT NOT NULL DEFAULT '#0ea5e9',
  language TEXT NOT NULL DEFAULT 'en',
  social_media JSONB NOT NULL DEFAULT '{}'::jsonb,
  headshot_url TEXT NULL,
  logo_url TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_card_profiles_user_id ON public.ai_card_profiles(user_id);

-- AI Card QR Codes (tracked QR assets for AI cards)
CREATE TABLE IF NOT EXISTS public.ai_card_qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  destination_url TEXT NOT NULL,
  qr_svg TEXT NOT NULL,
  total_scans INTEGER NOT NULL DEFAULT 0,
  last_scanned_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_card_qr_codes_user_id ON public.ai_card_qr_codes(user_id);

-- AI Sidekick Training Feedback
CREATE TABLE IF NOT EXISTS public.ai_sidekick_training_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sidekick_id UUID NOT NULL REFERENCES public.ai_sidekick_profiles(id) ON DELETE CASCADE,
  sidekick_scope TEXT NOT NULL,
  message_id TEXT NULL,
  feedback TEXT NOT NULL CHECK (feedback IN ('positive', 'negative')),
  improvement TEXT NULL,
  user_message TEXT NULL,
  assistant_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sidekick_feedback_user ON public.ai_sidekick_training_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_sidekick_feedback_sidekick ON public.ai_sidekick_training_feedback(sidekick_id);
CREATE INDEX IF NOT EXISTS idx_sidekick_feedback_scope ON public.ai_sidekick_training_feedback(sidekick_scope);

-- AI Conversations (omni-channel AI interactions)
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_name TEXT NULL,
  contact_email TEXT NULL,
  contact_phone TEXT NULL,
  type TEXT NOT NULL CHECK (type IN ('chat', 'voice', 'email')),
  last_message TEXT NULL,
  last_message_at TIMESTAMPTZ NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'important', 'follow-up')),
  message_count INTEGER NOT NULL DEFAULT 0,
  property TEXT NULL,
  tags TEXT[] NULL,
  intent TEXT NULL,
  language TEXT NULL,
  voice_transcript TEXT NULL,
  follow_up_task TEXT NULL,
  metadata JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON public.ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_last_message ON public.ai_conversations(user_id, COALESCE(last_message_at, created_at) DESC);

-- AI Conversation Messages
CREATE TABLE IF NOT EXISTS public.ai_conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  sender TEXT NOT NULL CHECK (sender IN ('lead', 'agent', 'ai')),
  channel TEXT NOT NULL CHECK (channel IN ('chat', 'voice', 'email')),
  content TEXT NOT NULL,
  translation JSONB NULL,
  metadata JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversation_messages_conversation ON public.ai_conversation_messages(conversation_id, created_at);

-- ============================================================================
-- 2. CREATE STORAGE BUCKET FOR AI KB FILES
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('ai-kb', 'ai-kb', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('ai-card-assets', 'ai-card-assets', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.ai_sidekick_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_kb ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_phone_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_card_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_card_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_sidekick_training_feedback ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. CREATE RLS POLICIES - AI SIDEKICK PROFILES (user_id is UUID)
-- ============================================================================

-- Drop existing policies first (idempotent)
DROP POLICY IF EXISTS "Users can read own sidekick profiles" ON public.ai_sidekick_profiles;
DROP POLICY IF EXISTS "Users can insert own sidekick profiles" ON public.ai_sidekick_profiles;
DROP POLICY IF EXISTS "Users can update own sidekick profiles" ON public.ai_sidekick_profiles;
DROP POLICY IF EXISTS "Users can delete own sidekick profiles" ON public.ai_sidekick_profiles;

-- Allow users to read their own profiles
CREATE POLICY "Users can read own sidekick profiles"
ON public.ai_sidekick_profiles
FOR SELECT
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Allow users to insert their own profiles
CREATE POLICY "Users can insert own sidekick profiles"
ON public.ai_sidekick_profiles
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Allow users to update their own profiles
CREATE POLICY "Users can update own sidekick profiles"
ON public.ai_sidekick_profiles
FOR UPDATE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Allow users to delete their own profiles
CREATE POLICY "Users can delete own sidekick profiles"
ON public.ai_sidekick_profiles
FOR DELETE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- ============================================================================
-- 5. CREATE RLS POLICIES - AI KNOWLEDGE BASE (user_id is TEXT)
-- ============================================================================

-- Drop existing policies first (idempotent)
DROP POLICY IF EXISTS "Users can read own kb entries" ON public.ai_kb;
DROP POLICY IF EXISTS "Users can insert own kb entries" ON public.ai_kb;
DROP POLICY IF EXISTS "Users can update own kb entries" ON public.ai_kb;
DROP POLICY IF EXISTS "Users can delete own kb entries" ON public.ai_kb;

-- Allow users to read their own KB entries
CREATE POLICY "Users can read own kb entries"
ON public.ai_kb
FOR SELECT
USING (auth.uid() IS NOT NULL AND user_id = auth.uid()::text);

-- Allow users to insert their own KB entries
CREATE POLICY "Users can insert own kb entries"
ON public.ai_kb
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid()::text);

-- Allow users to update their own KB entries
CREATE POLICY "Users can update own kb entries"
ON public.ai_kb
FOR UPDATE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid()::text)
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid()::text);

-- Allow users to delete their own KB entries
CREATE POLICY "Users can delete own kb entries"
ON public.ai_kb
FOR DELETE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid()::text);

-- ============================================================================
-- 6. CREATE RLS POLICIES - APPOINTMENTS
-- ============================================================================

-- Drop existing policies first (idempotent)
DROP POLICY IF EXISTS "Users can read own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can insert own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can update own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can delete own appointments" ON public.appointments;

-- Allow users to read their own appointments
CREATE POLICY "Users can read own appointments"
ON public.appointments
FOR SELECT
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Allow users to insert their own appointments
CREATE POLICY "Users can insert own appointments"
ON public.appointments
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Allow users to update their own appointments
CREATE POLICY "Users can update own appointments"
ON public.appointments
FOR UPDATE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Allow users to delete their own appointments
CREATE POLICY "Users can delete own appointments"
ON public.appointments
FOR DELETE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- ============================================================================
-- 6a. CREATE RLS POLICIES - LEADS & PHONE LOGS
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can insert own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can update own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can delete own leads" ON public.leads;

CREATE POLICY "Users can read own leads"
ON public.leads
FOR SELECT
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can insert own leads"
ON public.leads
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can update own leads"
ON public.leads
FOR UPDATE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can delete own leads"
ON public.leads
FOR DELETE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

DROP POLICY IF EXISTS "Users can read own lead logs" ON public.lead_phone_logs;
DROP POLICY IF EXISTS "Users can insert own lead logs" ON public.lead_phone_logs;
DROP POLICY IF EXISTS "Users can delete own lead logs" ON public.lead_phone_logs;

CREATE POLICY "Users can read own lead logs"
ON public.lead_phone_logs
FOR SELECT
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can insert own lead logs"
ON public.lead_phone_logs
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can delete own lead logs"
ON public.lead_phone_logs
FOR DELETE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- ============================================================================
-- 7. CREATE RLS POLICIES - AI CARD PROFILES
-- ============================================================================

-- Drop existing policies first (idempotent)
DROP POLICY IF EXISTS "Users can read own ai card profiles" ON public.ai_card_profiles;
DROP POLICY IF EXISTS "Users can insert own ai card profiles" ON public.ai_card_profiles;
DROP POLICY IF EXISTS "Users can update own ai card profiles" ON public.ai_card_profiles;
DROP POLICY IF EXISTS "Users can delete own ai card profiles" ON public.ai_card_profiles;

-- Allow users to read their own AI card profile
CREATE POLICY "Users can read own ai card profiles"
ON public.ai_card_profiles
FOR SELECT
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Allow users to insert their own AI card profile
CREATE POLICY "Users can insert own ai card profiles"
ON public.ai_card_profiles
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Allow users to update their own AI card profile
CREATE POLICY "Users can update own ai card profiles"
ON public.ai_card_profiles
FOR UPDATE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Allow users to delete their own AI card profile
CREATE POLICY "Users can delete own ai card profiles"
ON public.ai_card_profiles
FOR DELETE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- ============================================================================
-- 8. CREATE RLS POLICIES - AI CARD QR CODES
-- ============================================================================

-- Drop existing policies first (idempotent)
DROP POLICY IF EXISTS "Users can read own ai card qr codes" ON public.ai_card_qr_codes;
DROP POLICY IF EXISTS "Users can insert own ai card qr codes" ON public.ai_card_qr_codes;
DROP POLICY IF EXISTS "Users can update own ai card qr codes" ON public.ai_card_qr_codes;
DROP POLICY IF EXISTS "Users can delete own ai card qr codes" ON public.ai_card_qr_codes;

CREATE POLICY "Users can read own ai card qr codes"
ON public.ai_card_qr_codes
FOR SELECT
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can insert own ai card qr codes"
ON public.ai_card_qr_codes
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can update own ai card qr codes"
ON public.ai_card_qr_codes
FOR UPDATE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can delete own ai card qr codes"
ON public.ai_card_qr_codes
FOR DELETE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- ============================================================================
-- 9. CREATE RLS POLICIES - AI CONVERSATIONS
-- ============================================================================

-- Drop existing policies first (idempotent)
DROP POLICY IF EXISTS "Users can read own ai conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Users can insert own ai conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Users can update own ai conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Users can delete own ai conversations" ON public.ai_conversations;

CREATE POLICY "Users can read own ai conversations"
ON public.ai_conversations
FOR SELECT
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can insert own ai conversations"
ON public.ai_conversations
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can update own ai conversations"
ON public.ai_conversations
FOR UPDATE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can delete own ai conversations"
ON public.ai_conversations
FOR DELETE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- ============================================================================
-- 10. CREATE RLS POLICIES - AI CONVERSATION MESSAGES
-- ============================================================================

-- Drop existing policies first (idempotent)
DROP POLICY IF EXISTS "Users can read own ai conversation messages" ON public.ai_conversation_messages;
DROP POLICY IF EXISTS "Users can insert own ai conversation messages" ON public.ai_conversation_messages;
DROP POLICY IF EXISTS "Users can update own ai conversation messages" ON public.ai_conversation_messages;
DROP POLICY IF EXISTS "Users can delete own ai conversation messages" ON public.ai_conversation_messages;

CREATE POLICY "Users can read own ai conversation messages"
ON public.ai_conversation_messages
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.ai_conversations c
    WHERE c.id = conversation_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own ai conversation messages"
ON public.ai_conversation_messages
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.ai_conversations c
    WHERE c.id = conversation_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own ai conversation messages"
ON public.ai_conversation_messages
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.ai_conversations c
    WHERE c.id = conversation_id AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.ai_conversations c
    WHERE c.id = conversation_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own ai conversation messages"
ON public.ai_conversation_messages
FOR DELETE
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.ai_conversations c
    WHERE c.id = conversation_id AND c.user_id = auth.uid()
  )
);

-- ============================================================================
-- 11. CREATE RLS POLICIES - AI SIDEKICK TRAINING FEEDBACK
-- ============================================================================

-- Drop existing policies first (idempotent)
DROP POLICY IF EXISTS "Users can read own sidekick feedback" ON public.ai_sidekick_training_feedback;
DROP POLICY IF EXISTS "Users can insert own sidekick feedback" ON public.ai_sidekick_training_feedback;
DROP POLICY IF EXISTS "Users can delete own sidekick feedback" ON public.ai_sidekick_training_feedback;

CREATE POLICY "Users can read own sidekick feedback"
ON public.ai_sidekick_training_feedback
FOR SELECT
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can insert own sidekick feedback"
ON public.ai_sidekick_training_feedback
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can delete own sidekick feedback"
ON public.ai_sidekick_training_feedback
FOR DELETE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- ============================================================================
-- 12. CREATE RLS POLICIES - STORAGE (AI KB FILES)
-- ============================================================================

-- Drop existing policies first (idempotent)
DROP POLICY IF EXISTS "Users can upload own kb files" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own kb files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own kb files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own ai card files" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own ai card files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own ai card files" ON storage.objects;

-- Allow users to upload files to their own folder
CREATE POLICY "Users can upload own kb files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'ai-kb' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own files
CREATE POLICY "Users can read own kb files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'ai-kb' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete own kb files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'ai-kb' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to upload AI card assets
CREATE POLICY "Users can upload own ai card files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'ai-card-assets' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their AI card assets
CREATE POLICY "Users can read own ai card files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'ai-card-assets' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their AI card assets
CREATE POLICY "Users can delete own ai card files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'ai-card-assets' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- 7. ADMIN-ONLY POLICIES (for backend service role)
-- ============================================================================

-- Drop existing policies first (idempotent)
DROP POLICY IF EXISTS "Users can read own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can read own ai usage" ON public.ai_usage_monthly;

-- Audit logs: only backend can write, users can read their own (user_id is TEXT)
CREATE POLICY "Users can read own audit logs"
ON public.audit_logs
FOR SELECT
USING (auth.uid() IS NOT NULL AND user_id = auth.uid()::text);

-- AI usage: users can read their own (user_id is TEXT)
CREATE POLICY "Users can read own ai usage"
ON public.ai_usage_monthly
FOR SELECT
USING (auth.uid() IS NOT NULL AND user_id = auth.uid()::text);

-- Security alerts: admin-only (no RLS policies for regular users)
-- Backups: admin-only (no RLS policies for regular users)

-- ============================================================================
-- 8. FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_ai_sidekick_profiles_updated_at ON public.ai_sidekick_profiles;
CREATE TRIGGER update_ai_sidekick_profiles_updated_at
  BEFORE UPDATE ON public.ai_sidekick_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Copy env.example to .env.local and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
-- 2. For backend, create backend/.env with SUPABASE_SERVICE_ROLE_KEY
-- 3. Enable Supabase Auth providers (email/magic link recommended)
-- 4. Test by signing up a user and creating a sidekick profile
-- ============================================================================
