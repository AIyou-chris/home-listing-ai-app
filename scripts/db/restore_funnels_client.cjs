
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
const envPaths = [
    path.resolve(__dirname, '../../.env.local'),
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../../backend/.env.local'),
    path.resolve(__dirname, '../../backend/.env')
];
envPaths.forEach(p => dotenv.config({ path: p }));

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function restoreFunnels() {
    console.log('🔄 Restoring Funnels via Client...');

    // 1. Get Admin User
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error || !users) {
        console.error('❌ Failed to list users:', error);
        return;
    }
    const admin = users.find(u => u.email && u.email.includes('homelistingai.com')) || users[0];
    if (!admin) {
        console.error('❌ No admin user found');
        return;
    }
    const adminId = admin.id;
    console.log(`👤 Using Admin ID: ${adminId}`);

    // --- REALTOR FUNNEL ---
    console.log('\n--- Restoring Realtor Funnel ---');
    let realtorFunnelId;
    const { data: existingRealtor } = await supabase
        .from('funnels')
        .select('id')
        .match({ agent_id: adminId, funnel_key: 'realtor_funnel' })
        .maybeSingle();

    if (existingRealtor) {
        realtorFunnelId = existingRealtor.id;
        await supabase.from('funnels').update({
            name: 'Realtor Funnel', type: 'realtor', is_default: true
        }).eq('id', realtorFunnelId);
        console.log('Updated existing Realtor Funnel');
    } else {
        const { data: newFunnel } = await supabase.from('funnels').insert({
            agent_id: adminId, name: 'Realtor Funnel', type: 'realtor', funnel_key: 'realtor_funnel', is_default: true, version: 1, default_version: 1
        }).select().single();
        realtorFunnelId = newFunnel.id;
        console.log('Created new Realtor Funnel');
    }

    // Clear Steps
    await supabase.from('funnel_steps').delete().eq('funnel_id', realtorFunnelId);

    // Insert Steps
    const realtorSteps = [
        {
            funnel_id: realtorFunnelId,
            step_name: 'Instant AI Welcome',
            step_index: 1,
            delay_days: 0,
            action_type: 'email',
            subject: 'Welcome to Your Personal Real Estate Concierge ✨',
            content: `Hi {{lead.name}},

Thanks for reaching out! I'm excited to help you navigate your real estate journey.

🤖 **Meet Your 24/7 AI Concierge**
I've built a personalized AI assistant just for you that can answer questions instantly, share property insights, and help you explore listings at your own pace—even at 2 AM!

👉 **Access Your AI Card Here:** {{agent.aiCardUrl || agent.website}}

**What You Can Do Inside:**
✅ Browse handpicked properties matched to your interests
✅ Get instant answers to buying/selling questions  
✅ Schedule a consultation with me directly

I'm here whenever you need me—reply to this email, call {{agent.phone}}, or chat with the AI concierge anytime.

Best,  
{{agent.name}}`
        },
        {
            funnel_id: realtorFunnelId,
            step_name: 'Day 1 Check-In',
            step_index: 2,
            delay_days: 1,
            action_type: 'email',
            subject: '🏡 Quick Tour of Your AI Tools',
            content: `Hi {{lead.name}},

Hope you had a chance to explore your AI concierge! 

**🎯 Smart Property Matching**  
The AI learns what you like and suggests new listings automatically. 

**📅 Instant Scheduling**  
Book property tours or consultation calls directly through your AI card.

Ready to dive deeper? Reply with a good time this week for a quick call.

Cheers,  
{{agent.name}}`
        },
        {
            funnel_id: realtorFunnelId,
            step_name: 'Agent Task: Call',
            step_index: 3,
            delay_days: 2,
            action_type: 'task',
            subject: 'Call Lead',
            content: 'Call {{lead.name}} to confirm their goals and highlight key AI card features.'
        },
        {
            funnel_id: realtorFunnelId,
            step_name: 'Market Alert',
            step_index: 4,
            delay_days: 10,
            action_type: 'email',
            subject: '🚨 Market Alert: Opportunities You Can\'t Miss',
            content: `Hi {{lead.name}},

The market shifted this week in your favor—here's the insider scoop:

**📈 Market Update:**  
• **List-to-Sale Ratio:** 98% (sellers negotiation room)  
• **New Listings:** Inventory is up 12%  
• **Interest Rates:** Slight dip this week

**💰 What This Means for You:**  
✅ **Buyer's market conditions** — More negotiating power  
✅ **Less competition** on well-priced homes  

**🔥 Hot Picks That Just Dropped:**  
I'm tracking 3 new properties that match your criteria. Want me to send them over, or should we line up tours this weekend?

**📅 Next Steps:**  
1. **Get pre-approved** (if you haven't already)
2. **Tour your top choices** before someone else does  

Reply with "SEND PICKS" and I'll share this week's best opportunities.

Staying ahead of the market with you,  
{{agent.name}}`
        }
    ];

    for (const step of realtorSteps) {
        const { error } = await supabase.from('funnel_steps').insert(step);
        if (error) console.error(`Failed to insert step ${step.step_name}:`, error);
        else console.log(`✅ Inserted step: ${step.step_name}`);
    }


    // --- BROKER FUNNEL ---
    console.log('\n--- Restoring Broker Funnel ---');
    let brokerFunnelId;
    const { data: existingBroker } = await supabase
        .from('funnels')
        .select('id')
        .match({ agent_id: adminId, funnel_key: 'broker_funnel' })
        .maybeSingle();

    if (existingBroker) {
        brokerFunnelId = existingBroker.id;
        await supabase.from('funnels').update({
            name: 'Broker / Recruiter Funnel', type: 'broker', is_default: false
        }).eq('id', brokerFunnelId);
        console.log('Updated existing Broker Funnel');
    } else {
        const { data: newFunnel } = await supabase.from('funnels').insert({
            agent_id: adminId, name: 'Broker / Recruiter Funnel', type: 'broker', funnel_key: 'broker_funnel', is_default: false, version: 1, default_version: 1
        }).select().single();
        brokerFunnelId = newFunnel.id;
        console.log('Created new Broker Funnel');
    }

    await supabase.from('funnel_steps').delete().eq('funnel_id', brokerFunnelId);

    const brokerSteps = [
        {
            funnel_id: brokerFunnelId,
            step_name: 'Broker Intro',
            step_index: 1,
            delay_days: 0,
            action_type: 'email',
            subject: 'Ready to keep 100% of your commission?',
            content: `Hi {{lead.name}},

I noticed you're doing great work in the area. Have you ever considered how much more you could earn with a brokerage that truly supports your growth?

Let's chat about our 100% commission model.

Best,
{{agent.name}}`
        },
        {
            funnel_id: brokerFunnelId,
            step_name: 'Technology Edge',
            step_index: 2,
            delay_days: 1,
            action_type: 'email',
            subject: 'The tech stack you deserve 🚀',
            content: `Hi {{lead.name}},

Most brokers give you a desk and a prayer. We give you a full AI command center.

- Auto-generated listing sites
- 24/7 AI lead qualification
- Smart follow-up funnels (like this one!)

Curious to see it in action?

Cheers,
{{agent.name}}`
        },
        {
            funnel_id: brokerFunnelId,
            step_name: 'Agent Success',
            step_index: 3,
            delay_days: 3,
            action_type: 'email',
            subject: 'Meet Sarah, who doubled her GCI',
            content: `Hi {{lead.name}},

Just wanted to share a quick win from our team. Sarah joined us 6 months ago and...

[Insert Case Study Link]

When can we grab coffee?
{{agent.name}}`
        },
        {
            funnel_id: brokerFunnelId,
            step_name: 'Recruit Call Task',
            step_index: 4,
            delay_days: 4,
            action_type: 'task',
            subject: 'Call Recruit',
            content: 'Call {{lead.name}} and ask for a 15-minute coffee meeting.'
        }
    ];

    for (const step of brokerSteps) {
        const { error } = await supabase.from('funnel_steps').insert(step);
        if (error) console.error(`Failed to insert step ${step.step_name}:`, error);
        else console.log(`✅ Inserted step: ${step.step_name}`);
    }

    console.log('\n✨ DONE: All funnels restored and updated.');
}

restoreFunnels();
