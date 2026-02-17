-- Revenue System Schema Migration
-- Defines the core infrastructure for independent, metric-tracked funnels.

-- 1. Funnels Table
CREATE TABLE IF NOT EXISTS funnels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('realtor', 'broker')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Funnel Steps Table
CREATE TABLE IF NOT EXISTS funnel_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    funnel_id UUID REFERENCES funnels(id) ON DELETE CASCADE,
    step_name TEXT NOT NULL,
    step_index INTEGER NOT NULL,
    email_template_id TEXT, -- Nullable if not an email step
    delay_days INTEGER DEFAULT 0,
    action_type TEXT NOT NULL DEFAULT 'email', -- email, sms, task
    content TEXT, -- JSON or text content for the step
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Lead Funnel Progress Table
CREATE TABLE IF NOT EXISTS lead_funnel_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL, -- Assumes leads table exists
    funnel_id UUID REFERENCES funnels(id) ON DELETE CASCADE,
    current_step_index INTEGER DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'exited')),
    entered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_step_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(lead_id, funnel_id)
);

-- 4. Funnel Step Metrics Table
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_funnel_steps_funnel_id ON funnel_steps(funnel_id);
CREATE INDEX IF NOT EXISTS idx_lead_progress_lead_id ON lead_funnel_progress(lead_id);
CREATE INDEX IF NOT EXISTS idx_step_metrics_step_id ON funnel_step_metrics(funnel_step_id);

-- Initial Seed Data (Idempotent)
INSERT INTO funnels (name, type)
SELECT 'Realtor Funnel', 'realtor'
WHERE NOT EXISTS (SELECT 1 FROM funnels WHERE type = 'realtor');

INSERT INTO funnels (name, type)
SELECT 'Broker Funnel', 'broker'
WHERE NOT EXISTS (SELECT 1 FROM funnels WHERE type = 'broker');

-- Seed Steps for Realtor Funnel (Example)
WITH realtor_funnel AS (SELECT id FROM funnels WHERE type = 'realtor' LIMIT 1)
INSERT INTO funnel_steps (funnel_id, step_name, step_index, delay_days, action_type)
SELECT id, 'Welcome Email', 1, 0, 'email' FROM realtor_funnel
WHERE NOT EXISTS (SELECT 1 FROM funnel_steps WHERE funnel_id = (SELECT id FROM realtor_funnel) AND step_index = 1);
