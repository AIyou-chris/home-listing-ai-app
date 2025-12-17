-- SECURE RLS POLICIES (Fix Critical Area 3)
-- Risk: Users could overwrite/delete shared 'demo-blueprint' data.
-- Fix: Restrict INSERT/UPDATE/DELETE to own data only. Allow SELECT on demo data.

-- 1. LEADS TABLE
DROP POLICY IF EXISTS "Users can insert their own leads" ON leads;
DROP POLICY IF EXISTS "Users can update their own leads" ON leads;
DROP POLICY IF EXISTS "Users can delete their own leads" ON leads;
DROP POLICY IF EXISTS "Users can view their own leads" ON leads;

CREATE POLICY "Users can insert their own leads" ON leads FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update their own leads" ON leads FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete their own leads" ON leads FOR DELETE USING (auth.uid()::text = user_id::text);
-- Allow viewing demo data (Read Only)
CREATE POLICY "Users can view their own leads" ON leads FOR SELECT USING (auth.uid()::text = user_id::text OR user_id::text = 'demo-blueprint');


-- 2. APPOINTMENTS TABLE
DROP POLICY IF EXISTS "Users can insert their own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can update their own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can delete their own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can view their own appointments" ON appointments;

CREATE POLICY "Users can insert their own appointments" ON appointments FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update their own appointments" ON appointments FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete their own appointments" ON appointments FOR DELETE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can view their own appointments" ON appointments FOR SELECT USING (auth.uid()::text = user_id::text OR user_id::text = 'demo-blueprint');


-- 3. PHONE LOGS TABLE
DROP POLICY IF EXISTS "Users can insert their own phone logs" ON lead_phone_logs;
DROP POLICY IF EXISTS "Users can view their own phone logs" ON lead_phone_logs;

CREATE POLICY "Users can insert their own phone logs" ON lead_phone_logs FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can view their own phone logs" ON lead_phone_logs FOR SELECT USING (auth.uid()::text = user_id::text OR user_id::text = 'demo-blueprint');
