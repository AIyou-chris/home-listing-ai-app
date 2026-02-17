DO $$
DECLARE
    admin_id UUID;
BEGIN
    -- 1. Get Admin ID (same logic as before)
    SELECT id INTO admin_id FROM auth.users WHERE email = 'us@homelistingai.com' LIMIT 1;
    
    IF admin_id IS NULL THEN
        SELECT id INTO admin_id FROM auth.users LIMIT 1;
    END IF;

    IF admin_id IS NOT NULL THEN
        -- 2. Insert Broker Funnel
        INSERT INTO funnels (agent_id, name, type, funnel_key, steps, is_default, version, default_version)
        SELECT admin_id, 'Broker / Recruiter Funnel', 'broker', 'broker_funnel', '[]'::jsonb, false, 1, 1
        WHERE NOT EXISTS (SELECT 1 FROM funnels WHERE type = 'broker');

        RAISE NOTICE 'Checked/Seeded Broker Funnel.';
    ELSE
        RAISE NOTICE 'No admin user found. Skipping seed.';
    END IF;
END $$;
