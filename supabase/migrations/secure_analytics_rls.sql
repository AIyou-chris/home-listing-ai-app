-- Fix RLS Policy for Property Analytics
-- Previous policy was too permissive (allowed any auth user to read all analytics)

-- 1. Drop the insecure policy if it exists
DROP POLICY IF EXISTS "Allow authenticated read" ON public.property_analytics;

-- 2. Create the secure policy
-- Only allow access if the user is the owner of the property
CREATE POLICY "Allow authenticated owner read" ON public.property_analytics
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id 
            FROM public.properties 
            WHERE id = property_analytics.property_id::uuid
        )
    );

-- Note: We cast property_id to uuid because property_analytics.property_id is text 
-- but properties.id is uuid. 

-- Verify or enable RLS
ALTER TABLE public.property_analytics ENABLE ROW LEVEL SECURITY;
