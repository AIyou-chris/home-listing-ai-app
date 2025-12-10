-- Create Templates Table
CREATE TABLE IF NOT EXISTS public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  template_key TEXT NOT NULL,
  name TEXT NOT NULL,
  channel TEXT NOT NULL,
  category TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  default_version INTEGER NOT NULL DEFAULT 1,
  content TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_agent_id ON public.templates(agent_id);
CREATE INDEX IF NOT EXISTS idx_templates_key ON public.templates(template_key);

-- Create Funnels Table
CREATE TABLE IF NOT EXISTS public.funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  funnel_key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  default_version INTEGER NOT NULL DEFAULT 1,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_funnels_agent_id ON public.funnels(agent_id);
CREATE INDEX IF NOT EXISTS idx_funnels_key ON public.funnels(funnel_key);

-- Enable RLS
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnels ENABLE ROW LEVEL SECURITY;

-- Backend Service Role Bypass (implicit), but adding basic policies for Agent access
-- Assuming agents have auth_user_id linked
CREATE POLICY "Agents can view own templates" ON public.templates
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.agents a WHERE a.id = templates.agent_id AND a.auth_user_id = auth.uid())
  );

CREATE POLICY "Agents can update own templates" ON public.templates
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.agents a WHERE a.id = templates.agent_id AND a.auth_user_id = auth.uid())
  );

CREATE POLICY "Agents can view own funnels" ON public.funnels
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.agents a WHERE a.id = funnels.agent_id AND a.auth_user_id = auth.uid())
  );

CREATE POLICY "Agents can update own funnels" ON public.funnels
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.agents a WHERE a.id = funnels.agent_id AND a.auth_user_id = auth.uid())
  );
