const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function seed() {
    console.log('🌱 Seeding Test Data (User + Agent + Lead)...');

    const email = `test_user_${Date.now()}@example.com`;
    // 1. Create Auth User
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: 'password123',
        email_confirm: true
    });

    if (authErr) {
        console.error('❌ Auth User Create Failed:', authErr.message);
        return;
    }
    console.log('✅ Created Auth User:', user.id);

    // 2. Create Agent Profile
    const { data: agent, error: agentErr } = await supabaseAdmin.from('agents').insert({
        id: user.id, // Link to auth user
        email: email,
        first_name: 'Test',
        last_name: 'Agent',
        slug: 'agent-' + user.id,
        subscription_status: 'active'
    }).select().single();

    if (agentErr) {
        console.error('❌ Agent Insert Failed:', agentErr.message);
        return;
    }
    console.log('✅ Created Agent Profile:', agent.id);

    // 3. Create Lead
    // Try 'user_id' (most likely based on previous error) for the agent link
    const { data: lead, error: leadErr } = await supabaseAdmin.from('leads').insert({
        user_id: agent.id,
        email: `lead_${Date.now()}@test.com`,
        name: 'Testy McLead',
        status: 'New', // Capitalized status
        source: 'Manual Entry'
    }).select().single();

    if (leadErr) {
        console.error('❌ Lead Insert Failed:', leadErr.message);
        // Fallback check if it really wanted agent_id? No, error said user_id_fkey.
    } else {
        console.log('✅ Created Lead:', lead.id);
    }
}

seed();
