-- 1. Ensure Agents Table Exists & Has All Columns
CREATE TABLE IF NOT EXISTS public.agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Safely add columns if they are missing (Upgrade existing table)
DO $$ 
BEGIN 
    ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS first_name TEXT;
    ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS last_name TEXT;
    ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS email TEXT;
    ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS phone TEXT;
    ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS company TEXT;
    ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS title TEXT;
    ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS bio TEXT;
    ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS website TEXT;
    ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS headshot_url TEXT;
    ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
    ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'agent';
    ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'Free';
    ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
    ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- Enable RLS on agents
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Policies for Agents (Drop existing first to avoid conflict)
DROP POLICY IF EXISTS "Agents can view their own profile" ON public.agents;
CREATE POLICY "Agents can view their own profile" ON public.agents
    FOR SELECT USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Agents can update their own profile" ON public.agents;
CREATE POLICY "Agents can update their own profile" ON public.agents
    FOR UPDATE USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Admins can view all agents" ON public.agents;
CREATE POLICY "Admins can view all agents" ON public.agents
    FOR SELECT USING (
        -- Check if user is admin via user_roles OR simply allow all agents to see each other for directory
        -- For now, let's just assume simple RLS:
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super-admin'))
    );


-- 2. Ensure Properties (Listings) Table Exists & Has All Columns
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Safely add columns if they are missing
DO $$ 
BEGIN 
    ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS address TEXT;
    ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS price NUMERIC;
    ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS bedrooms INTEGER;
    ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS bathrooms NUMERIC;
    ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS sqft INTEGER;
    ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS property_type TEXT;
    ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
    ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS listing_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS hero_photos TEXT[];
    ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS gallery_photos TEXT[];
    ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS features TEXT[];
    ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS marketing_stats JSONB DEFAULT '{"views": 0, "inquiries": 0}'::jsonb;
    ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- Enable RLS on properties
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Policies for Properties
DROP POLICY IF EXISTS "Users can view their own properties" ON public.properties;
CREATE POLICY "Users can view their own properties" ON public.properties
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own properties" ON public.properties;
CREATE POLICY "Users can insert their own properties" ON public.properties
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own properties" ON public.properties;
CREATE POLICY "Users can update their own properties" ON public.properties
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own properties" ON public.properties;
CREATE POLICY "Users can delete their own properties" ON public.properties
    FOR DELETE USING (auth.uid() = user_id);

-- Create Index for performance
CREATE INDEX IF NOT EXISTS idx_properties_user_id ON public.properties(user_id);
