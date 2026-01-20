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

    // 1. Get a valid user ID from AUTH.USERS
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error || !users || users.length === 0) {
        console.error('❌ No AUTH users found to assign lead to.', error);
        return;
    }
    const userId = users[0].id; // Use the first found user
    console.log(`👤 Using AUTH User ID: ${userId}`);

    // 2. Prepare Payload (With Integer Score)
    const payload = {
        user_id: userId,
        name: "Debug Lead " + Date.now(),
        email: `debug_import_${Date.now()}@example.com`,
        phone: "555-0000",
        status: 'New',
        source: 'Import',
        notes: "Company: Test Corp\n[Tag: debug] Imported via Script",
        created_at: new Date().toISOString(),
        score: 10 // INTEGER, not object
    };

    console.log('📦 Payload:', JSON.stringify(payload, null, 2));

    // 3. Attempt Insert
    const { data, error: insertError } = await supabaseAdmin
        .from('leads')
        .insert([payload])
        .select();

    if (insertError) {
        console.error('❌ INSERT FAILED:', insertError);
    } else {
        console.log('✅ Insert Success!', data);
    }
}

debugImport();
