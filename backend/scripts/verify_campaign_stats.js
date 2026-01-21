const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

// Load env
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.DANGEROUS_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    console.error('❌ Missing Env Vars');
    process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

async function seedCampaignStats() {
    console.log('🚀 Seeding Campaign Data...');

    // 1. Get Agent
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    if (!users?.length) return console.error('No users found');
    const agentId = users[0].id;
    console.log(`👤 using Agent: ${agentId}`);

    // 2. Create 2 Leads
    const { data: leads } = await supabaseAdmin.from('leads').insert([
        { user_id: agentId, name: 'Valid Lead', email: `valid_${Date.now()}@test.com`, status: 'New', source: 'Seed' },
        { user_id: agentId, name: 'Bounce Lead', email: `bounce_${Date.now()}@test.com`, status: 'Bounced', source: 'Seed' }
    ]).select();

    if (!leads) return console.error('Failed to create leads');
    console.log(`✅ Created ${leads.length} leads`);

    // 3. Create Active Enrollment (for Valid Lead)
    // Need a dummy funnel ID? No, we can insert without foreign key if strict mode is off, 
    // BUT typically we need one. 
    // Let's check if any funnel exists.
    const { data: funnels } = await supabaseAdmin.from('funnels').select('id').limit(1);
    const funnelId = funnels?.[0]?.id;

    if (funnelId) {
        await supabaseAdmin.from('funnel_enrollments').insert({
            agent_id: agentId,
            lead_id: leads[0].id,
            funnel_id: funnelId,
            current_step_index: 0,
            status: 'active',
            next_run_at: new Date().toISOString()
        });
        console.log('✅ Created Active Enrollment');
    } else {
        console.warn('⚠️ No funnels found, skipping enrollment creation (Active Pipe will be 0)');
    }

    // 4. Log "Emails Sent" (funnel_logs)
    // We log for BOTH leads
    await supabaseAdmin.from('funnel_logs').insert([
        {
            enrollment_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID if allowed, or skip FK check? 
            // Actually, funnel_logs might require valid enrollment_id. 
            // Let's use the one we just made for lead 1.
            // For lead 2 (bounce), we won't have an enrollment if we didn't make one.
            // Let's just create an enrollment for lead 2 too, even if status is bounced (or was active then bounced).
            agent_id: agentId,
            step_index: 0,
            action_type: 'email',
            status: 'success',
            result_details: { subject: 'Welcome' }
        },
        {
            enrollment_id: '00000000-0000-0000-0000-000000000000', // If FK violation, this will fail.
            agent_id: agentId,
            step_index: 0,
            action_type: 'email',
            status: 'success',
            result_details: { subject: 'Welcome' }
        }
    ]).catch(err => console.warn('⚠️ Could not insert logs (likely FK constraint):', err.message));

    // If FK constraint exists on funnel_logs.enrollment_id, we need real enrollments.
    // I will try to rely on the fact that I created one real enrollment.
    // To properly count 2 emails, I should probably create 2 enrollments.

    // RETRYING clean approach:
    if (funnelId) {
        const { data: enrollment2 } = await supabaseAdmin.from('funnel_enrollments').insert({
            agent_id: agentId,
            lead_id: leads[1].id,
            funnel_id: funnelId,
            current_step_index: 0,
            status: 'failed', // It bounced
            next_run_at: new Date().toISOString()
        }).select().single();

        // Now insert logs for real enrollments
        await supabaseAdmin.from('funnel_logs').insert([
            { enrollment_id: enrollment2.id, agent_id: agentId, step_index: 0, action_type: 'email', status: 'success' }
        ]);

        // Find the first enrollment ID
        const { data: existingEnroll } = await supabaseAdmin.from('funnel_enrollments').select('id').eq('lead_id', leads[0].id).single();
        await supabaseAdmin.from('funnel_logs').insert([
            { enrollment_id: existingEnroll.id, agent_id: agentId, step_index: 0, action_type: 'email', status: 'success' }
        ]);
        console.log('✅ Inserted Funnel Logs');
    }

    console.log('🎉 Seed Complete. Check Dashboard.');
}

seedCampaignStats();
