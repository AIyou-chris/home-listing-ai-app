-- Cold email to loan officers: prospects, batches, sends and replies.
-- Service-role only (RLS on, no policies). Safe to run more than once.
-- Unsubscribes and bounces go in the existing lo_suppression_list.

CREATE TABLE IF NOT EXISTS public.lo_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  first_name text,
  last_name text,
  company text,
  nmls_id text,
  city text,
  state text,
  source text,
  personalization_fact text,
  personalization_source_url text,
  status text NOT NULL DEFAULT 'new',  -- new, verified, bad_email, in_sequence, replied, demo_booked, unsubscribed, bounced, complained
  mx_ok boolean,
  verified_at timestamptz,
  unsub_token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  last_contacted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cold_email_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  angle text NOT NULL,
  opener text NOT NULL DEFAULT 'A',
  variant_id text NOT NULL DEFAULT 'A',
  send_window text NOT NULL DEFAULT 'morning',
  reply_only boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'draft',  -- draft, approved, paused, done
  paused_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  approved_by text
);

CREATE TABLE IF NOT EXISTS public.cold_email_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.cold_email_batches(id) ON DELETE CASCADE,
  prospect_id uuid NOT NULL REFERENCES public.lo_prospects(id) ON DELETE CASCADE,
  touch int NOT NULL,
  angle text,
  opener text,
  variant_id text,
  subject text,
  body_text text,
  check_failures jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending',  -- pending, draft, approved, sent, failed, cancelled
  skip_reason text,
  scheduled_for timestamptz,
  mailbox text,
  message_id text,
  sent_at timestamptz,
  clicked_at timestamptz,
  replied_at timestamptz,
  reply_class text,
  bounced_at timestamptz,
  complained_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (prospect_id, touch)
);
CREATE INDEX IF NOT EXISTS cold_email_sends_due_idx ON public.cold_email_sends (status, scheduled_for);

CREATE TABLE IF NOT EXISTS public.cold_email_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES public.lo_prospects(id) ON DELETE SET NULL,
  send_id uuid REFERENCES public.cold_email_sends(id) ON DELETE SET NULL,
  from_email text,
  subject text,
  body_text text,
  class text NOT NULL,
  drafted_reply text,
  handled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lo_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cold_email_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cold_email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cold_email_replies ENABLE ROW LEVEL SECURITY;
