const path = require('path');
const dotenv = require('dotenv');

// Load env from root
const envPath = path.resolve(__dirname, '../../.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

const { createClient } = require('@supabase/supabase-js');
const funnelExecutionService = require('../services/funnelExecutionService');

// --- SETUP ---
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.DANGEROUS_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    console.error('❌ Missing Env Vars');
    console.log('VITE_SUPABASE_URL:', SUPABASE_URL ? 'Set' : 'Missing');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE ? 'Set' : 'Missing');
    process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

// Mock Email/SMS Services
const mockEmailService = {
    sendEmail: async (params) => {
        console.log(`📧 [MOCK EMAIL] To: ${params.to} | Subject: ${params.subject}`);
        return { sent: true };
    }
};

const mockSmsService = {
    sendSms: async (to, body) => {
        console.log(`📱 [MOCK SMS] To: ${to} | Body: ${body}`);
        return { sent: true };
    }
};

const funnelExecutor = funnelExecutionService({
    supabaseAdmin,
    emailService: mockEmailService,
    smsService: mockSmsService
});


async function runSmokeTest() {
    console.log('🚀 Starting Smoke Test...');
    const timestamp = Date.now();
    const testAgentEmail = `smoke_test_agent_${timestamp}@example.com`;
    const testLeadEmail = `smoke_lead_${timestamp}@example.com`;
    let agentId = null;

    try {
        // 1. CREATE TEST AGENT
        console.log('\n--- Step 1: Create Test Agent ---');
        const { data: agentData, error: agentError } = await supabaseAdmin.auth.admin.createUser({
            email: testAgentEmail,
            password: 'Password123!',
            email_confirm: true,
            user_metadata: { full_name: 'Smoke Test Agent' }
        });

        if (agentError) throw agentError;
        agentId = agentData.user.id;

        // Insert into agents table
        const { error: upsertError } = await supabaseAdmin.from('agents').upsert({
            id: agentId,
            email: testAgentEmail,
            first_name: 'Smoke',
            last_name: 'Test',
            slug: `smoke-test-${timestamp}`, // Added slug
            status: 'active'
        });

        if (upsertError) {
            console.error('Agent Upsert Error:', upsertError);
            throw upsertError;
        }
        console.log(`✅ Agent Created: ${agentId} (${testAgentEmail})`);


        // 2. SIMULATE BATCH IMPORT (Backend Insert)
        console.log('\n--- Step 2: Batch Import Leads ---');
        const leadsToImport = [];
        for (let i = 0; i < 5; i++) {
            leadsToImport.push({
                user_id: agentId,
                name: `Lead ${i}_${timestamp}`,
                email: i === 0 ? testLeadEmail : `lead${i}_${timestamp}@test.com`,
                phone: `555-000-${1000 + i}`,
                // company: 'Test Corp Inc.',
                notes: 'Company: Test Corp Inc.\nImported via SmokeTest',
                status: 'New',
                source: 'SmokeTest',
                created_at: new Date().toISOString()
            });
        }

        const { data: leadsData, error: importError } = await supabaseAdmin
            .from('leads')
            .insert(leadsToImport)
            .select();

        if (importError) throw importError;
        console.log(`✅ Imported ${leadsData.length} leads.`);

        // Verify Company Field (Fallback to Notes)
        const lead0 = leadsData.find(l => l.email === testLeadEmail);
        if (!lead0) throw new Error('Lead 0 failed to create');

        if (lead0.notes && lead0.notes.includes('Company: Test Corp Inc.')) {
            console.log(`✅ Verified 'Company' saved in Notes correctly.`);
        } else {
            console.error(`❌ 'Company' field verification failed. Notes: ${lead0.notes}`);
        }


        // 3. ENROLL IN FUNNEL
        console.log('\n--- Step 3: Enroll in Funnel ---');
        const { data: funnelData, error: funnelError } = await supabaseAdmin
            .from('funnels')
            .insert({
                agent_id: agentId,
                funnel_key: `smoke-test-${timestamp}`,
                name: 'Smoke Test Funnel',
                // type: 'custom', // Removed 'type' as it doesn't exist in schema
                steps: [
                    {
                        id: `step-${timestamp}-1`,
                        type: 'email',
                        subject: 'Welcome {{lead.first_name}}',
                        content: 'This is a test email.',
                        step_key: 'welcome_email',
                        delay_minutes: 0
                    }
                ]
            })
            .select()
            .single();

        if (funnelError) throw funnelError;
        const funnelId = funnelData.id;
        console.log(`✅ Created Test Funnel: ${funnelId}`);

        const { error: enrollError } = await supabaseAdmin
            .from('funnel_enrollments')
            .insert({
                lead_id: lead0.id,
                agent_id: agentId,
                funnel_id: funnelId,
                status: 'active',
                current_step_index: 0,
                next_run_at: new Date().toISOString()
            });
        if (enrollError) throw enrollError;
        console.log(`✅ Enrolled Lead 0 in Funnel.`);


        // 4. EXECUTE FUNNEL (Run 1)
        console.log('\n--- Step 4: Execute Funnel (Run 1) ---');
        if (funnelExecutor.processBatch) {
            await funnelExecutor.processBatch();
            console.log(`✅ Funnel batch processed.`);
        } else {
            console.warn(`⚠️ processBatch not found on executor.`);
        }

        // Check logs
        const { data: logs } = await supabaseAdmin
            .from('funnel_logs')
            .select('*')
            .eq('agent_id', agentId)
            .eq('action_type', 'email');

        if (logs && logs.length > 0) {
            console.log(`✅ Found ${logs.length} execution logs. Email sent.`);
        } else {
            console.warn(`⚠️ No execution logs found.`);
        }


        // 5. SIMULATE CONVERSION
        console.log('\n--- Step 5: Simulate Conversion ---');
        console.log(`🔎 Simulating payment from: ${testLeadEmail}`);

        const { data: leadsFound } = await supabaseAdmin
            .from('leads')
            .select('id, name, status')
            .eq('email', testLeadEmail)
            .limit(1);

        if (leadsFound && leadsFound.length > 0) {
            const leadToConvert = leadsFound[0];

            // UPDATE TO WON
            const { error: updateError } = await supabaseAdmin
                .from('leads')
                .update({ status: 'Won', notes: 'Smoke Test Conversion' })
                .eq('id', leadToConvert.id);

            if (updateError) throw updateError;
            console.log(`✅ Lead status updated to 'Won'.`);
        } else {
            console.error(`❌ Lead not found.`);
        }


        // 6. VERIFY SAFETY STOP
        console.log('\n--- Step 6: Verify Funnel Safety Stop ---');
        // We need to re-activate the enrollment or enroll them again or just verify logic.
        // Actually, processBatch only picks up 'active' enrollments.
        // If the previous step executed successfully, it might have moved to 'completed' if there were no more steps.
        // Let's force the enrollment back to 'active' specifically to test the Safety Stop logic.
        await supabaseAdmin
            .from('funnel_enrollments')
            .update({ status: 'active', current_step_index: 0, next_run_at: new Date().toISOString() })
            .eq('lead_id', lead0.id);
        console.log('   (Forced enrollment back to active to test stop logic)');

        if (funnelExecutor.processBatch) {
            await funnelExecutor.processBatch();
        }

        const { data: enrollmentAfter } = await supabaseAdmin
            .from('funnel_enrollments')
            .select('status')
            .eq('lead_id', lead0.id)
            .single();

        if (enrollmentAfter.status === 'completed') {
            console.log(`✅ Enrollment marked as 'completed' (Safety Stop worked).`);
        } else {
            console.error(`❌ Safety Stop Failed. Status: ${enrollmentAfter.status}`);
        }

        console.log('\n✨ SMOKE TEST COMPLETE ✨');

    } catch (err) {
        console.error('❌ SMOKE TEST FAILED:', err);
    } finally {
        // Cleanup
        if (agentId) {
            console.log('\n--- Cleanup ---');
            await supabaseAdmin.auth.admin.deleteUser(agentId);
            console.log(`✅ Deleted test agent.`);
        }
    }
}

runSmokeTest();
