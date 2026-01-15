-- FIX: Add missing Foreign Keys to funnel_enrollments
-- This is required for Supabase to perform joins (e.g. fetching lead details during execution)

DO $$ 
BEGIN
    -- 1. Link Lead ID
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'funnel_enrollments_lead_id_fkey') THEN
        ALTER TABLE public.funnel_enrollments
        ADD CONSTRAINT funnel_enrollments_lead_id_fkey
        FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;
    END IF;

    -- 2. Link Agent ID
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'funnel_enrollments_agent_id_fkey') THEN
        ALTER TABLE public.funnel_enrollments
        ADD CONSTRAINT funnel_enrollments_agent_id_fkey
        FOREIGN KEY (agent_id) REFERENCES public.agents(id);
    END IF;

    -- 3. Link Funnel ID
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'funnel_enrollments_funnel_id_fkey') THEN
        ALTER TABLE public.funnel_enrollments
        ADD CONSTRAINT funnel_enrollments_funnel_id_fkey
        FOREIGN KEY (funnel_id) REFERENCES public.funnels(id) ON DELETE CASCADE;
    END IF;
END $$;
