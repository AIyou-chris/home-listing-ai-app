-- Create Short Links Table
CREATE TABLE IF NOT EXISTS public.short_links (
    slug text PRIMARY KEY,
    url text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    clicks integer DEFAULT 0,
    last_clicked timestamp with time zone
);

-- Access Policies for Short Links
ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read short links (for redirection)
CREATE POLICY "Allow public read access" ON public.short_links
    FOR SELECT USING (true);

-- Allow authenticated users (agents) to create short links
CREATE POLICY "Allow authenticated insert" ON public.short_links
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow service role (backend) to do everything
CREATE POLICY "Allow service_role full access" ON public.short_links
    USING (auth.role() = 'service_role');


-- Create Property Analytics Table
CREATE TABLE IF NOT EXISTS public.property_analytics (
    property_id text PRIMARY KEY,
    views integer DEFAULT 0,
    last_viewed timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

-- Access Policies for Analytics
ALTER TABLE public.property_analytics ENABLE ROW LEVEL SECURITY;

-- Allow public to increment views (via backend RPC or direct update if needed, but usually backend handles this via service role)
-- For now, we rely on the backend (service_role) to update this table.

-- Allow authenticated users (agents) to read analytics for their properties
-- (Note: robust implementation would check property ownership, but for now we allow auth read)
CREATE POLICY "Allow authenticated read" ON public.property_analytics
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow service_role full access
CREATE POLICY "Allow service_role full access analytics" ON public.property_analytics
    USING (auth.role() = 'service_role');
