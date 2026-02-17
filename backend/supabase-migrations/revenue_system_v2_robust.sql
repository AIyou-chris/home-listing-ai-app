-- Revenue System Schema Migration (v2 - Robust)
-- Fixes conflicts with existing tables and ensures correct schema.

-- 1. Handle existing 'funnel_steps' table (Backup if incompatible)
DO $$
BEGIN
    -- Check if funnel_steps exists and has 'funnel_type' column (legacy schema)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'funnel_steps' AND column_name = 'funnel_type') THEN
        ALTER TABLE funnel_steps RENAME TO funnel_steps_legacy;
    END IF;
END $$;

-- 2. Create/Update Funnels Table
CREATE TABLE IF NOT EXISTS funnels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add 'type' column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'funnels' AND column_name = 'type') THEN
        ALTER TABLE funnels ADD COLUMN type TEXT;
        ALTER TABLE funnels ADD CONSTRAINT check_type CHECK (type IN ('realtor', 'broker'));
    END IF;
END $$;

-- 3. Create NEW Funnel Steps Table (Normalized)
CREATE TABLE IF NOT EXISTS funnel_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    funnel_id UUID REFERENCES funnels(id) ON DELETE CASCADE,
    step_name TEXT NOT NULL,
    step_index INTEGER NOT NULL,
    email_template_id TEXT,
    delay_days INTEGER DEFAULT 0,
    action_type TEXT NOT NULL DEFAULT 'email',
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Lead Funnel Progress Table
CREATE TABLE IF NOT EXISTS lead_funnel_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL,
    funnel_id UUID REFERENCES funnels(id) ON DELETE CASCADE,
    current_step_index INTEGER DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'exited')),
    entered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_step_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(lead_id, funnel_id)
);

-- 5. Funnel Step Metrics Table
CREATE TABLE IF NOT EXISTS funnel_step_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    funnel_step_id UUID REFERENCES funnel_steps(id) ON DELETE CASCADE,
    sent_count INTEGER DEFAULT 0,
    opens INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    unsubscribes INTEGER DEFAULT 0,
    bounces INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(funnel_step_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_funnel_steps_funnel_id ON funnel_steps(funnel_id);
CREATE INDEX IF NOT EXISTS idx_lead_progress_lead_id ON lead_funnel_progress(lead_id);
CREATE INDEX IF NOT EXISTS idx_step_metrics_step_id ON funnel_step_metrics(funnel_step_id);

-- 6. Initial Seed Data (Idempotent)
INSERT INTO funnels (name, type)
SELECT 'Realtor Funnel', 'realtor'
WHERE NOT EXISTS (SELECT 1 FROM funnels WHERE type = 'realtor');

INSERT INTO funnels (name, type)
SELECT 'Broker Funnel', 'broker'
WHERE NOT EXISTS (SELECT 1 FROM funnels WHERE type = 'broker');

-- Seed Steps for Realtor Funnel (Example)
-- Use WITH CTE to get ID
DO $$
DECLARE
    realtor_id UUID;
    broker_id UUID;
BEGIN
    SELECT id INTO realtor_id FROM funnels WHERE type = 'realtor' LIMIT 1;
    IF realtor_id IS NOT NULL THEN
        INSERT INTO funnel_steps (funnel_id, step_name, step_index, delay_days, action_type)
        SELECT realtor_id, 'Welcome Email', 1, 0, 'email'
        WHERE NOT EXISTS (SELECT 1 FROM funnel_steps WHERE funnel_id = realtor_id AND step_index = 1);
    END IF;

    SELECT id INTO broker_id FROM funnels WHERE type = 'broker' LIMIT 1;
    IF broker_id IS NOT NULL THEN
        INSERT INTO funnel_steps (funnel_id, step_name, step_index, delay_days, action_type)
        SELECT broker_id, 'Broker Intro', 1, 0, 'email'
        WHERE NOT EXISTS (SELECT 1 FROM funnel_steps WHERE funnel_id = broker_id AND step_index = 1);
    END IF;
END $$;
