-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    status TEXT DEFAULT 'New',
    source TEXT DEFAULT 'Manual',
    notes TEXT,
    last_message TEXT,
    funnel_type TEXT,
    interested_properties TEXT[],
    active_sequences TEXT[],
    last_contact TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create lead_phone_logs table
CREATE TABLE IF NOT EXISTS lead_phone_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    call_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    call_outcome TEXT,
    call_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    property_id TEXT,
    property_address TEXT,
    kind TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    date TEXT,
    time_label TEXT,
    start_iso TIMESTAMP WITH TIME ZONE,
    end_iso TIMESTAMP WITH TIME ZONE,
    meet_link TEXT,
    notes TEXT,
    status TEXT DEFAULT 'Scheduled',
    remind_agent BOOLEAN DEFAULT TRUE,
    remind_client BOOLEAN DEFAULT TRUE,
    agent_reminder_minutes_before INTEGER DEFAULT 60,
    client_reminder_minutes_before INTEGER DEFAULT 60,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_phone_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own leads" ON leads FOR SELECT USING (auth.uid()::text = user_id OR user_id = 'demo-blueprint');
CREATE POLICY "Users can insert their own leads" ON leads FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id = 'demo-blueprint');
CREATE POLICY "Users can update their own leads" ON leads FOR UPDATE USING (auth.uid()::text = user_id OR user_id = 'demo-blueprint');
CREATE POLICY "Users can delete their own leads" ON leads FOR DELETE USING (auth.uid()::text = user_id OR user_id = 'demo-blueprint');

CREATE POLICY "Users can view their own phone logs" ON lead_phone_logs FOR SELECT USING (auth.uid()::text = user_id OR user_id = 'demo-blueprint');
CREATE POLICY "Users can insert their own phone logs" ON lead_phone_logs FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id = 'demo-blueprint');

CREATE POLICY "Users can view their own appointments" ON appointments FOR SELECT USING (auth.uid()::text = user_id OR user_id = 'demo-blueprint');
CREATE POLICY "Users can insert their own appointments" ON appointments FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id = 'demo-blueprint');
CREATE POLICY "Users can update their own appointments" ON appointments FOR UPDATE USING (auth.uid()::text = user_id OR user_id = 'demo-blueprint');
CREATE POLICY "Users can delete their own appointments" ON appointments FOR DELETE USING (auth.uid()::text = user_id OR user_id = 'demo-blueprint');
