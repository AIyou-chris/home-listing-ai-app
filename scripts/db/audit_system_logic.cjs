const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const FunnelEnginePath = path.resolve(__dirname, '../../backend/services/FunnelEngine.js');

async function runAudit() {
    console.log('🚀 Starting System Audit...');
    const report = {
        section1: { status: 'PENDING', notes: [] },
        section2: { status: 'PENDING', notes: [] },
        section3: { status: 'PENDING', notes: [] }
    };

    try {
        // --- 1. Funnel Structure Validation ---
        console.log('\n--- SECTION 1: Funnel Structure ---');
        const { data: funnels, error: fError } = await supabaseAdmin.from('funnels').select('*');
        if (fError) throw fError;

        const realtorFunnel = funnels.find(f => f.type === 'realtor' || f.funnel_key === 'realtor_funnel');
        const brokerFunnel = funnels.find(f => f.type === 'broker' || f.funnel_key === 'broker_funnel');

        if (!realtorFunnel) report.section1.notes.push('❌ Realtor Funnel NOT found');
        else {
            report.section1.notes.push(`✅ Realtor Funnel found (ID: ${realtorFunnel.id})`);
            console.log('ℹ️ Realtor Funnel details:', realtorFunnel);
        }

        if (!brokerFunnel) report.section1.notes.push('❌ Broker Funnel NOT found');
        else {
            report.section1.notes.push(`✅ Broker Funnel found (ID: ${brokerFunnel.id})`);
            console.log('ℹ️ Broker Funnel details:', brokerFunnel);
        }

        if (realtorFunnel && brokerFunnel) {
            report.section1.status = 'PASS';

            // Check Broker Steps
            const { data: steps, error: sError } = await supabaseAdmin
                .from('funnel_steps')
                .select('*')
                .eq('funnel_id', brokerFunnel.id)
                .order('step_index');

            if (sError) throw sError;
            report.section1.notes.push(`ℹ️ Broker Funnel has ${steps.length} steps.`);
            if (steps.length === 4) report.section1.notes.push('✅ Exactly 4 steps found.');
            else {
                report.section1.notes.push(`❌ Expected 4 steps, found ${steps.length}.`);
                report.section1.status = 'FAIL';
            }
        } else {
            report.section1.status = 'FAIL';
        }


        // --- 1.5 Fetch Valid User ID ---
        // Fetch from existing leads to ensure FK validity
        const { data: existingLeads } = await supabaseAdmin
            .from('leads')
            .select('user_id')
            .not('user_id', 'is', null)
            .limit(1);

        let testUserId = existingLeads && existingLeads.length > 0 ? existingLeads[0].user_id : null;

        if (!testUserId) {
            console.warn('⚠️ No existing leads found. Trying to find a user from funnels...');
            const { data: fUsers } = await supabaseAdmin.from('funnels').select('agent_id').not('agent_id', 'is', null).limit(1);
            if (fUsers && fUsers.length > 0) testUserId = fUsers[0].agent_id;
        }

        if (!testUserId) {
            console.warn('⚠️ No valid user_id found. Fallback to hardcoded admin ID if known, or fail.');
            throw new Error('❌ Could not find a valid user_id to attach lead to.');
        }

        // --- 2. Lead Assignment Test ---
        console.log('\n--- SECTION 2: Lead Assignment ---');
        // Create Test Lead
        const testEmail = `audit_test_${Date.now()}@example.com`;
        const { data: newLead, error: lError } = await supabaseAdmin
            .from('leads')
            .insert({
                user_id: testUserId,
                name: 'Audit Test Lead',
                email: testEmail,
                status: 'New',
                source: 'System Audit'
            })
            .select()
            .single();

        if (lError) throw lError;
        console.log(`✅ Created test lead: ${newLead.email} (ID: ${newLead.id})`);

        // Trigger Assignment
        const engine = require(FunnelEnginePath);

        console.log('🔄 Triggering FunnelEngine.assignFunnel()...');

        // Dynamically get the key
        const targetType = brokerFunnel.funnel_key || brokerFunnel.type || 'broker';
        console.log(`ℹ️ Target Type/Key: ${targetType}`);

        await engine.assignFunnel(newLead.id, targetType);

        // Verify Progress Record
        const { data: progress, error: pError } = await supabaseAdmin
            .from('lead_funnel_progress')
            .select('*')
            .eq('lead_id', newLead.id)
            .single();

        if (pError) {
            report.section2.notes.push(`❌ Progress record lookup failed: ${pError.message}`);
            report.section2.status = 'FAIL';
        } else if (progress) {
            report.section2.notes.push(`✅ Progress record created (ID: ${progress.id})`);
            report.section2.notes.push(`ℹ️ Funnel ID: ${progress.funnel_id}`);
            report.section2.notes.push(`ℹ️ Current Step: ${progress.current_step_index}`);
            report.section2.notes.push(`ℹ️ Status: ${progress.status}`);

            if (progress.current_step_index === 1 && progress.status === 'active') {
                report.section2.status = 'PASS';
            } else {
                report.section2.notes.push('❌ Step index or Status incorrect.');
                report.section2.status = 'FAIL';
            }
        } else {
            report.section2.notes.push('❌ No progress record found.');
            report.section2.status = 'FAIL';
        }

        // --- 3. Step Progression (Metric Check) ---
        console.log('\n--- SECTION 3: Step Progression ---');
        // We assigned -> executeStep(1) should have run.
        // Check metrics for Step 1 of Broker Funnel
        if (report.section2.status === 'PASS' && brokerFunnel) {
            // Find Step 1 ID
            const { data: step1 } = await supabaseAdmin
                .from('funnel_steps')
                .select('id')
                .eq('funnel_id', brokerFunnel.id)
                .eq('step_index', 1)
                .single();

            if (step1) {
                // Check Metrics
                const { data: metrics } = await supabaseAdmin
                    .from('funnel_step_metrics')
                    .select('sent_count')
                    .eq('funnel_step_id', step1.id)
                    .single();

                report.section3.notes.push(`ℹ️ Step 1 Metrics: ${JSON.stringify(metrics)}`);
                if (metrics && metrics.sent_count > 0) {
                    report.section3.notes.push('✅ Sent count > 0. Step action fired.');
                    report.section3.status = 'PASS';
                } else {
                    report.section3.notes.push('❌ Sent count is 0. Step did not fire or record metric.');
                    report.section3.status = 'FAIL';
                }
            } else {
                report.section3.notes.push('❌ Step 1 definition not found.');
                report.section3.status = 'FAIL';
            }
        } else {
            report.section3.notes.push('⚠️ Skipping Section 3 due to previous failures.');
            report.section3.status = 'SKIPPED';
        }

    } catch (err) {
        console.error('❌ Audit Failed:', err);
    } finally {
        console.log('\n\n=== AUDIT REPORT ===');
        console.log(JSON.stringify(report, null, 2));
        process.exit(0);
    }
}

runAudit();
