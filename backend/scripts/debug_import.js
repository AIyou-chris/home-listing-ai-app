const path = require('path');
const dotenv = require('dotenv');

// Load env
const envPath = path.resolve(__dirname, '../../.env');
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

async function debugImport() {
    console.log('🚀 Starting Debug Import...');

    // 1. Get a valid user ID (grab the first one found in agents/users)
    const { data: users } = await supabaseAdmin.from('agents').select('id').limit(1);
    const userId = users?.[0]?.id;

    if (!userId) {
        console.error('❌ No users found to assign lead to.');
        return;
    }
    console.log(`👤 Using User ID: ${userId}`);

    // 2. Prepare Payload (Matching leadsService.ts)
    const initialScore = {
        totalScore: 10,
        tier: 'Cold',
        lastUpdated: new Date().toISOString(),
        scoreHistory: []
    };

    const payload = {
        user_id: userId,
        name: "Debug Lead " + Date.now(),
        email: `debug_import_${Date.now()}@example.com`,
        phone: "555-0000",
        status: 'New',
        source: 'Import',
        notes: "Company: Test Corp\n[Tag: debug] Imported via Script",
        // funnel_type: null, // Optional, leaving null
        created_at: new Date().toISOString(),
        score: initialScore
    };

    console.log('📦 Payload:', JSON.stringify(payload, null, 2));

    // 3. Attempt Insert
    const { data, error } = await supabaseAdmin
        .from('leads')
        .insert([payload])
        .select();

    if (error) {
        console.error('❌ INSERT FAILED:', error);
    } else {
        console.log('✅ Insert Success!', data);
    }
}

debugImport();
