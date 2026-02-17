-- ============================================
-- LEAD SCORING V2.0 MIGRATION
-- ============================================

-- 1. Add new columns to leads table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'score_tier') THEN
        ALTER TABLE leads ADD COLUMN score_tier VARCHAR(50);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'score_breakdown') THEN
        ALTER TABLE leads ADD COLUMN score_breakdown JSONB;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'last_behavior_at') THEN
        ALTER TABLE leads ADD COLUMN last_behavior_at TIMESTAMPTZ;
    END IF;
END $$;

-- 2. Create lead_score_history table
CREATE TABLE IF NOT EXISTS lead_score_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    previous_score INTEGER,
    new_score INTEGER,
    event_trigger VARCHAR(100),
    scoring_version VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

-- 3. Create index for fast history lookups
CREATE INDEX IF NOT EXISTS idx_lead_score_history_lead_id ON lead_score_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_score_history_created_at ON lead_score_history(created_at);

-- 4. Enable RLS (if applicable) and policies (Optional, depending on your setup)
-- ALTER TABLE lead_score_history ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Enable read access for authenticated users" ON lead_score_history FOR SELECT TO authenticated USING (true);
