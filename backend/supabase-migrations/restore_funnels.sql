
DO $$
DECLARE
    admin_id UUID;
    realtor_funnel_id UUID;
    broker_funnel_id UUID;
BEGIN
    -- 0. FIX SCHEMA: Ensure 'subject' column exists in funnel_steps
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'funnel_steps' AND column_name = 'subject') THEN
        ALTER TABLE funnel_steps ADD COLUMN subject TEXT;
        RAISE NOTICE 'Added subject column to funnel_steps';
    END IF;

    -- 1. Get Admin ID
    SELECT id INTO admin_id FROM auth.users WHERE email = 'us@homelistingai.com' LIMIT 1;
    IF admin_id IS NULL THEN
        SELECT id INTO admin_id FROM auth.users LIMIT 1;
    END IF;

    IF admin_id IS NOT NULL THEN
        
        -- =================================================================
        -- 1. RESTORE/UPDATE REALTOR FUNNEL (The "2 AM" Funnel)
        -- =================================================================
        
        -- Check if it exists
        SELECT id INTO realtor_funnel_id FROM funnels WHERE agent_id = admin_id AND funnel_key = 'realtor_funnel';

        IF realtor_funnel_id IS NOT NULL THEN
            -- Upgrade existing
            UPDATE funnels SET name = 'Realtor Funnel', type = 'realtor', is_default = true WHERE id = realtor_funnel_id;
        ELSE
            -- Insert new
            INSERT INTO funnels (agent_id, name, type, funnel_key, is_default, version, default_version)
            VALUES (admin_id, 'Realtor Funnel', 'realtor', 'realtor_funnel', true, 1, 1)
            RETURNING id INTO realtor_funnel_id;
        END IF;

        -- Clear existing steps to ensure clean state
        DELETE FROM funnel_steps WHERE funnel_id = realtor_funnel_id;

        -- Step 1: Welcome Email (The "2 AM" email)
        INSERT INTO funnel_steps (funnel_id, step_name, step_index, delay_days, action_type, subject, content)
        VALUES (
            realtor_funnel_id, 
            'Instant AI Welcome', 
            1, 
            0, -- Immediate
            'email',
            'Welcome to Your Personal Real Estate Concierge ✨',
            'Hi {{lead.name}},

Thanks for reaching out! I''m excited to help you navigate your real estate journey.

🤖 **Meet Your 24/7 AI Concierge**
I''ve built a personalized AI assistant just for you that can answer questions instantly, share property insights, and help you explore listings at your own pace—even at 2 AM!

👉 **Access Your AI Card Here:** {{agent.aiCardUrl || agent.website}}

**What You Can Do Inside:**
✅ Browse handpicked properties matched to your interests
✅ Get instant answers to buying/selling questions  
✅ Schedule a consultation with me directly

I''m here whenever you need me—reply to this email, call {{agent.phone}}, or chat with the AI concierge anytime.

Best,  
{{agent.name}}'
        );

        -- Step 2: Day 1 Check-In
        INSERT INTO funnel_steps (funnel_id, step_name, step_index, delay_days, action_type, subject, content)
        VALUES (
            realtor_funnel_id, 
            'Day 1 Check-In', 
            2, 
            1, 
            'email',
            '🏡 Quick Tour of Your AI Tools',
            'Hi {{lead.name}},

Hope you had a chance to explore your AI concierge! 

**🎯 Smart Property Matching**  
The AI learns what you like and suggests new listings automatically. 

**📅 Instant Scheduling**  
Book property tours or consultation calls directly through your AI card.

Ready to dive deeper? Reply with a good time this week for a quick call.

Cheers,  
{{agent.name}}'
        );

        -- Step 3: Task - Call Lead
        INSERT INTO funnel_steps (funnel_id, step_name, step_index, delay_days, action_type, subject, content)
        VALUES (
            realtor_funnel_id, 
            'Agent Task: Call', 
            3, 
            2, 
            'task',
            'Call Lead',
            'Call {{lead.name}} to confirm their goals and highlight key AI card features.'
        );

        -- Step 4: Market Shift Email
        INSERT INTO funnel_steps (funnel_id, step_name, step_index, delay_days, action_type, subject, content)
        VALUES (
            realtor_funnel_id,
            'Market Alert',
            4,
            10,
            'email',
            '🚨 Market Alert: Opportunities You Can''t Miss',
            'Hi {{lead.name}},

The market shifted this week in your favor—here''s the insider scoop:

**📈 Market Update:**  
• **List-to-Sale Ratio:** 98% (sellers negotiation room)  
• **New Listings:** Inventory is up 12%  
• **Interest Rates:** Slight dip this week

**💰 What This Means for You:**  
✅ **Buyer''s market conditions** — More negotiating power  
✅ **Less competition** on well-priced homes  

**🔥 Hot Picks That Just Dropped:**  
I''m tracking 3 new properties that match your criteria. Want me to send them over, or should we line up tours this weekend?

**📅 Next Steps:**  
1. **Get pre-approved** (if you haven''t already)
2. **Tour your top choices** before someone else does  

Reply with "SEND PICKS" and I''ll share this week''s best opportunities.

Staying ahead of the market with you,  
{{agent.name}}'
        );


        -- =================================================================
        -- 2. CREATE BROKER FUNNEL (New 4-Step Funnel)
        -- =================================================================

        -- Check if it exists
        SELECT id INTO broker_funnel_id FROM funnels WHERE agent_id = admin_id AND funnel_key = 'broker_funnel';

        IF broker_funnel_id IS NOT NULL THEN
            -- Upgrade existing
            UPDATE funnels SET name = 'Broker / Recruiter Funnel', type = 'broker', is_default = false WHERE id = broker_funnel_id;
        ELSE
            -- Insert new
            INSERT INTO funnels (agent_id, name, type, funnel_key, is_default, version, default_version)
            VALUES (admin_id, 'Broker / Recruiter Funnel', 'broker', 'broker_funnel', false, 1, 1)
            RETURNING id INTO broker_funnel_id;
        END IF;

        -- Clear existing steps
        DELETE FROM funnel_steps WHERE funnel_id = broker_funnel_id;

        -- Step 1: Recruiting Intro
        INSERT INTO funnel_steps (funnel_id, step_name, step_index, delay_days, action_type, subject, content)
        VALUES (
            broker_funnel_id, 
            'Broker Intro', 
            1, 
            0, 
            'email',
            'Ready to keep 100% of your commission?',
            'Hi {{lead.name}},

I noticed you''re doing great work in the area. Have you ever considered how much more you could earn with a brokerage that truly supports your growth?

Let''s chat about our 100% commission model.

Best,
{{agent.name}}'
        );

        -- Step 2: Value Prop
        INSERT INTO funnel_steps (funnel_id, step_name, step_index, delay_days, action_type, subject, content)
        VALUES (
            broker_funnel_id, 
            'Technology Edge', 
            2, 
            1, 
            'email',
            'The tech stack you deserve 🚀',
            'Hi {{lead.name}},

Most brokers give you a desk and a prayer. We give you a full AI command center.

- Auto-generated listing sites
- 24/7 AI lead qualification
- Smart follow-up funnels (like this one!)

Curious to see it in action?

Cheers,
{{agent.name}}'
        );

        -- Step 3: Social Proof / Case Study
        INSERT INTO funnel_steps (funnel_id, step_name, step_index, delay_days, action_type, subject, content)
        VALUES (
            broker_funnel_id, 
            'Agent Success', 
            3, 
            3, 
            'email',
            'Meet Sarah, who doubled her GCI',
            'Hi {{lead.name}},

Just wanted to share a quick win from our team. Sarah joined us 6 months ago and...

[Insert Case Study Link]

When can we grab coffee?
{{agent.name}}'
        );

        -- Step 4: Final Call Task
        INSERT INTO funnel_steps (funnel_id, step_name, step_index, delay_days, action_type, subject, content)
        VALUES (
            broker_funnel_id, 
            'Recruit Call Task', 
            4, 
            4, 
            'task',
            'Call Recruit',
            'Call {{lead.name}} and ask for a 15-minute coffee meeting.'
        );

        RAISE NOTICE 'Restored Realtor Funnel (2 AM version) and created Broker Funnel (4 Steps).';
    ELSE
        RAISE NOTICE 'No admin user found. Skipping restoration.';
    END IF;
END $$;
