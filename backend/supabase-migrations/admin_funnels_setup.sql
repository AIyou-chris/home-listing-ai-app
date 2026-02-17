-- Rename "Marketing Funnel" to "Realtor" for admin user
DO $$
DECLARE
    v_admin_id uuid;
    v_broker_funnel_id uuid;
BEGIN
    -- Get Admin User ID (adjust email if necessary)
    SELECT id INTO v_admin_id FROM auth.users WHERE email = 'admin@homelistingai.com';
    
    -- Rename "Marketing Funnel" to "Realtor" if it exists for this admin
    UPDATE public.funnels
    SET name = 'Realtor'
    WHERE user_id = v_admin_id AND name = 'Marketing Funnel';
    
    -- If no "Realtor" funnel exists, create one (this handles case where rename didn't happen because it didn't exist)
    IF NOT EXISTS (SELECT 1 FROM public.funnels WHERE user_id = v_admin_id AND name = 'Realtor') THEN
        INSERT INTO public.funnels (user_id, name, created_at, updated_at)
        VALUES (v_admin_id, 'Realtor', NOW(), NOW());
        
        -- Add default steps for Realtor funnel here if needed
    END IF;

    -- Create "Broker" Funnel if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM public.funnels WHERE user_id = v_admin_id AND name = 'Broker') THEN
        INSERT INTO public.funnels (user_id, name, created_at, updated_at)
        VALUES (v_admin_id, 'Broker', NOW(), NOW())
        RETURNING id INTO v_broker_funnel_id;
        
        -- Add 4 steps for Broker funnel
        INSERT INTO public.funnel_steps (funnel_id, name, "order", content, created_at, updated_at)
        VALUES
            (v_broker_funnel_id, 'Intro', 1, 'Initial Broker Introduction', NOW(), NOW()),
            (v_broker_funnel_id, 'Value Add', 2, 'Broker Value Proposition', NOW(), NOW()),
            (v_broker_funnel_id, 'Follow-up', 3, 'Broker Follow-up', NOW(), NOW()),
            (v_broker_funnel_id, 'Close', 4, 'Broker Closing Call', NOW(), NOW());
    END IF;
END $$;
