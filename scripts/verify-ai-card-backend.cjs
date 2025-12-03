require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_LEAD_USER_ID = process.env.DEFAULT_LEAD_USER_ID || '75114b93-e1c8-4d54-9e43-dd557d9e3ad9';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function testStorage() {
    console.log('Testing Storage Upload...');
    const buffer = Buffer.from('test image content');
    const path = `${DEFAULT_LEAD_USER_ID}/test-${Date.now()}.txt`;

    const { data, error } = await supabaseAdmin.storage
        .from('ai-card-assets')
        .upload(path, buffer, {
            contentType: 'text/plain',
            upsert: true
        });

    if (error) {
        console.error('❌ Storage Upload Failed:', error);
        return false;
    }
    console.log('✅ Storage Upload Success:', data);
    return true;
}

async function testDatabase() {
    console.log('Testing Database Upsert...');
    const payload = {
        user_id: DEFAULT_LEAD_USER_ID,
        full_name: 'Test User',
        bio: 'Test Bio',
        updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
        .from('ai_card_profiles')
        .upsert(payload, { onConflict: 'user_id' })
        .select('*')
        .single();

    if (error) {
        console.error('❌ Database Upsert Failed:', error);
        return false;
    }
    console.log('✅ Database Upsert Success:', data);
    return true;
}

async function run() {
    console.log(`Using User ID: ${DEFAULT_LEAD_USER_ID}`);

    const storageOk = await testStorage();
    const dbOk = await testDatabase();

    if (storageOk && dbOk) {
        console.log('🎉 All backend checks passed!');
    } else {
        console.error('💥 Some checks failed.');
    }
}

run();
