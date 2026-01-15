-- FUNNEL ENGINE TABLES
-- These tables track the state of automated marketing funnels

-- 1. Funnel Enrollments (Who is in what funnel?)
CREATE TABLE IF NOT EXISTS public.funnel_enrollments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id uuid NOT NULL, -- references agents(id)
    lead_id uuid NOT NULL, -- references leads(id)
    funnel_id uuid NOT NULL, -- references funnels(id) - The specific funnel instance for this agent
    
    current_step_index integer DEFAULT 0, -- Which step in the 'steps' array are they on?
    status text NOT NULL DEFAULT 'active', -- active, completed, paused, cancelled, failed
    
    next_run_at timestamp with time zone DEFAULT now(), -- When should the backend check this next?
    
    metadata jsonb DEFAULT '{}'::jsonb, -- Store dynamic variables (e.g. if we add branching later)
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Indexes for the Runner (Critical for performance)
CREATE INDEX IF NOT EXISTS idx_funnel_enrollments_runner 
    ON public.funnel_enrollments (status, next_run_at) 
    WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_funnel_enrollments_lead 
    ON public.funnel_enrollments (lead_id);

-- 2. Funnel Logs (Audit trail)
CREATE TABLE IF NOT EXISTS public.funnel_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    enrollment_id uuid NOT NULL REFERENCES public.funnel_enrollments(id),
    agent_id uuid NOT NULL, -- references agents(id)
    
    step_index integer NOT NULL,
    action_type text NOT NULL, -- email, sms, wait, task
    
    status text NOT NULL, -- success, failed, skipped
    result_details jsonb, -- API response, error message, etc.
    
    executed_at timestamp with time zone DEFAULT now()
);

-- RLS POLICIES (Security)
ALTER TABLE public.funnel_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_logs ENABLE ROW LEVEL SECURITY;

-- Agents can only see their own enrollments
CREATE POLICY "Agents can view own enrollments" ON public.funnel_enrollments
    FOR SELECT USING (auth.uid() = agent_id OR auth.role() = 'service_role');

CREATE POLICY "Agents can update own enrollments" ON public.funnel_enrollments
    FOR UPDATE USING (auth.uid() = agent_id OR auth.role() = 'service_role');

-- Service Role (Backend) has full access
CREATE POLICY "Service Role full access enrollments" ON public.funnel_enrollments
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service Role full access logs" ON public.funnel_logs
    FOR ALL USING (auth.role() = 'service_role');
