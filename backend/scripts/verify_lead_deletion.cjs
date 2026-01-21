const path = require('path');
const dotenv = require('dotenv');

// Load env from root
const envPath = path.resolve(__dirname, '../../.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

const { createClient } = require('@supabase/supabase-js');

// --- SETUP ---
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.DANGEROUS_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    console.error('❌ Missing Env Vars');
    process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

async function verifyDeletion() {
    console.log('🚀 Starting Deletion Verification...');
    const timestamp = Date.now();
    const testEmail = `del_test_${timestamp}@example.com`;
    let agentId = null;
    let leadId = null;

    try {
        // 1. Create a real test user
        console.log('1. Creating test user...');
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
            email: `test_user_${timestamp}@example.com`,
            password: 'Password123!',
            email_confirm: true
        });
        if (userError) throw userError;
        agentId = userData.user.id;

        // Create agent record
        const { error: agentUpsertError } = await supabaseAdmin.from('agents').upsert({
            id: agentId,
            email: `test_user_${timestamp}@example.com`,
            first_name: 'Test',
            last_name: 'User',
            status: 'active',
            slug: `test-user-${timestamp}`
        });
        if (agentUpsertError) throw agentUpsertError;
        console.log(`✅ Test user/agent created: ${agentId}`);

        // 2. Create a test lead
        console.log('2. Creating test lead...');
        const { data: leadData, error: leadError } = await supabaseAdmin.from('leads').insert({
            user_id: agentId,
            name: 'Deletable Lead',
            email: testEmail,
            status: 'New'
        }).select().single();

        if (leadError) throw leadError;
        leadId = leadData.id;
        console.log(`✅ Lead created: ${leadId}`);

        // 3. Create a test appointment
        console.log('3. Creating test appointment...');
        const { error: apptError } = await supabaseAdmin.from('appointments').insert({
            user_id: agentId,
            lead_id: leadId,
            name: 'Deletable Lead',
            email: testEmail,
            kind: 'showing',
            date: new Date().toISOString().split('T')[0],
            time_label: '10:00 AM',
            start_iso: new Date().toISOString(),
            end_iso: new Date().toISOString(),
            status: 'Scheduled'
        });
        if (apptError) throw apptError;
        console.log('✅ Appointment created.');

        // 4. Create a test funnel enrollment
        console.log('4. Creating test enrollment...');
        // We need a funnel first
        const { data: funnelData } = await supabaseAdmin.from('funnels').select('id').limit(1).single();
        if (funnelData) {
            const { data: enrollData, error: enrollError } = await supabaseAdmin.from('funnel_enrollments').insert({
                lead_id: leadId,
                agent_id: agentId,
                funnel_id: funnelData.id,
                status: 'active'
            }).select().single();
            if (enrollError) {
                console.warn('⚠️ Could not create enrollment (maybe no funnels?):', enrollError.message);
            } else {
                console.log('✅ Enrollment created.');
                // 5. Create a funnel log
                console.log('5. Creating funnel log...');
                const { error: logError } = await supabaseAdmin.from('funnel_logs').insert({
                    enrollment_id: enrollData.id,
                    agent_id: agentId,
                    step_index: 0,
                    action_type: 'test',
                    status: 'success'
                });
                if (logError) console.warn('⚠️ Could not create log:', logError.message);
                else console.log('✅ Log created.');
            }
        }

        // --- THE FIX LOGIC (Same as in server.cjs) ---
        console.log('\n--- EXECUTING DELETION LOGIC ---');

        // 1. Get enrollment IDs
        const { data: enrollments } = await supabaseAdmin
            .from('funnel_enrollments')
            .select('id')
            .eq('lead_id', leadId);

        if (enrollments && enrollments.length > 0) {
            const enrollmentIds = enrollments.map(e => e.id);
            // 2. Delete logs
            await supabaseAdmin.from('funnel_logs').delete().in('enrollment_id', enrollmentIds);
            console.log('✅ Cleared logs.');
        }

        // 3. Delete enrollments
        await supabaseAdmin.from('funnel_enrollments').delete().eq('lead_id', leadId);
        console.log('✅ Cleared enrollments.');

        // 4. Delete appointments
        await supabaseAdmin.from('appointments').delete().eq('lead_id', leadId);
        console.log('✅ Cleared appointments.');

        // 5. Delete Lead
        const { error: finalError } = await supabaseAdmin.from('leads').delete().eq('id', leadId);
        if (finalError) throw finalError;
        console.log('✅ Lead deleted successfully!');

        console.log('\n✨ VERIFICATION PASSED ✨');

    } catch (err) {
        console.error('❌ VERIFICATION FAILED:', err);
    } finally {
        if (agentId) {
            console.log('\n--- Cleanup ---');
            await supabaseAdmin.auth.admin.deleteUser(agentId);
            console.log(`✅ Deleted test user.`);
        }
    }
}

verifyDeletion().catch(err => {
    console.error('💥 FATAL ERROR:', err);
    process.exit(1);
});
