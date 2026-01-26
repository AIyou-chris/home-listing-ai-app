require('dotenv').config({ path: '../.env' }); // Adjust path if needed or rely on ENV
const { createClient } = require('@supabase/supabase-js');
const serviceCreator = require('../services/funnelExecutionService');

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://yocchddxdsaldgsibmmc.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Mock Email Service for Debug
const mockEmailService = {
    sendEmail: async (opts) => {
        console.log(`[MOCK EMAIL] Sending to ${opts.to} | Subject: ${opts.subject}`);
        return { success: true, messageId: 'mock-id' };
    }
};

const funnelService = serviceCreator({
    supabaseAdmin: supabase,
    emailService: mockEmailService,
    smsService: {}
});

async function debug() {
    console.log('🔍 --- DEBUGGING FUNNEL STATE ---');

    // 1. Check Total Enrollments
    const { count: totalEnrollments } = await supabase
        .from('funnel_enrollments')
        .select('*', { count: 'exact', head: true });

    console.log(`📊 Total Enrollments: ${totalEnrollments}`);

    // 2. Check Active Enrollments
    const { count: active } = await supabase
        .from('funnel_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

    console.log(`🟢 Active Enrollments: ${active}`);

    // 3. Check DUE Enrollments
    const now = new Date().toISOString();
    const { data: due, error } = await supabase
        .from('funnel_enrollments')
        .select('id, next_run_at, lead_id')
        .eq('status', 'active')
        .lte('next_run_at', now)
        .limit(5);

    if (error) console.error('❌ Error checking due:', error);
    else console.log(`⏰ DUE Enrollments (Ready to run): ${due.length > 0 ? due.length + '+' : 0}`);

    if (due && due.length > 0) {
        console.log('   Sample Due:', due[0]);
    }

    // 4. Check Logs
    const { count: logs } = await supabase
        .from('funnel_logs')
        .select('*', { count: 'exact', head: true })
        .eq('action_type', 'email');
    console.log(`📧 Email Logs Pattern matched (action_type='email'): ${logs}`);

    console.log('\n⚡ --- TRIGGERING BATCH (MOCK EMAIL) ---');
    await funnelService.processBatch();
}

debug();
