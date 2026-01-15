const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { createClient } = require('@supabase/supabase-js');
const createFunnelService = require('../services/funnelExecutionService');

// Config
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase Credentials');
    process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Mock Services
const mockEmailService = {
    sendEmail: async (payload) => {
        console.log('📧 [MOCK] Sending Email:', payload.subject);
        return { sent: true };
    }
};

const mockSmsService = {
    sendSms: async (to, msg) => {
        console.log('📱 [MOCK] Sending SMS:', msg);
        return { success: true };
    },
    validatePhoneNumber: async () => true
};

const funnelService = createFunnelService({
    supabaseAdmin,
    emailService: mockEmailService,
    smsService: mockSmsService
});

async function runSmokeTest() {
    console.log('🚀 Starting Funnel Engine Smoke Test...');

    try {
        // 1. Get a Real Agent & Lead (or create them if needed, but safer to use existing for smoke test if possible)
        // For safety, let's grab the first agent and lead we find.
        const { data: agent } = await supabaseAdmin.from('agents').select('id, email').limit(1).single();
        const { data: lead } = await supabaseAdmin.from('leads').select('id, email, name').limit(1).single();

        if (!agent || !lead) {
            console.error('❌ No Agent or Lead found in DB. Cannot test.');
            return;
        }

        console.log(`👤 Using Agent: ${agent.email}`);
        console.log(`👤 Using Lead: ${lead.email}`);

        // 2. Create a Temporary Test Funnel
        const testUuid = crypto.randomUUID();
        const { data: funnel, error: funnelError } = await supabaseAdmin.from('funnels').insert({
            agent_id: agent.id,
            funnel_key: `smoke-test-${Date.now()}`,
            name: 'Smoke Test Funnel',
            steps: [
                { type: 'email', subject: 'Step 1 Immediate', content: 'Hello', delay_minutes: 0 },
                { type: 'wait', delay_minutes: 0 } // Immediate completion check
            ],
            is_default: false
        }).select().single();

        if (funnelError) throw funnelError;
        console.log(`✅ Created Test Funnel: ${funnel.name} (${funnel.id})`);

        // 3. Enroll Lead
        console.log('🔄 Enrolling Lead...');
        const enrollment = await funnelService.enrollLead(agent.id, lead.id, funnel.id);
        console.log(`✅ Enrolled! Enrollment ID: ${enrollment.id}`);
        console.log(`   Next Run At: ${enrollment.next_run_at}`);

        // 4. Force Process Batch (The Engine)
        console.log('⚙️  Running Engine Process Batch...');
        await funnelService.processBatch();

        // 5. Verify Logs
        console.log('🔍 Verifying Execution Logs...');
        const { data: logs } = await supabaseAdmin
            .from('funnel_logs')
            .select('*')
            .eq('enrollment_id', enrollment.id);

        if (logs && logs.length > 0) {
            console.log(`✅ SUCCESS! Found ${logs.length} execution logs.`);
            logs.forEach(log => console.log(`   - Step ${log.step_index}: ${log.action_type} (${log.status})`));
        } else {
            console.error('❌ FAILURE: No logs executed. Engine did not pick up the enrollment.');
        }

        // Cleanup (Optional)
        console.log('🧹 Cleaning up test data...');
        await supabaseAdmin.from('funnel_enrollments').delete().eq('id', enrollment.id);
        await supabaseAdmin.from('funnels').delete().eq('id', funnel.id);
        console.log('✅ Cleanup complete.');

    } catch (err) {
        console.error('❌ Smoke Test Failed:', err);
    }
}

// Polyfill crypto if needed (Node < 19)
const crypto = require('crypto');

runSmokeTest();
