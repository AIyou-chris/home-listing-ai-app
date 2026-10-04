-- Admin "Business Brain": one row that holds the platform's own knowledge,
-- voice and sales/service wording. Feeds the landing-page chat.
-- Safe to run more than once.
CREATE TABLE IF NOT EXISTS public.platform_brain (
  id text PRIMARY KEY,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Only the backend (service role) reads or writes it.
ALTER TABLE public.platform_brain ENABLE ROW LEVEL SECURITY;
