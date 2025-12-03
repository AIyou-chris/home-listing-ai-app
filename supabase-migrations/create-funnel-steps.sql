-- Create funnel_steps table to store user funnel configurations
CREATE TABLE IF NOT EXISTS funnel_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    funnel_type TEXT NOT NULL, -- 'welcome', 'buyer', 'listing', 'post-showing'
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, funnel_type)
);

-- Enable RLS
ALTER TABLE funnel_steps ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own funnel steps"
    ON funnel_steps FOR SELECT
    USING (auth.uid()::text = user_id OR user_id = 'demo-blueprint');

CREATE POLICY "Users can insert their own funnel steps"
    ON funnel_steps FOR INSERT
    WITH CHECK (auth.uid()::text = user_id OR user_id = 'demo-blueprint');

CREATE POLICY "Users can update their own funnel steps"
    ON funnel_steps FOR UPDATE
    USING (auth.uid()::text = user_id OR user_id = 'demo-blueprint');

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_funnel_steps_user_type ON funnel_steps(user_id, funnel_type);
