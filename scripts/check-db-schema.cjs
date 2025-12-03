require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

async function checkSchema() {
    console.log('Checking ai_card_profiles schema...');

    // We can't query information_schema directly with supabase-js easily unless we use rpc or if we have permissions on a view.
    // But we can try to insert a row with nulls and see the error message, which is what the previous script did.
    // That is actually the most robust test.

    // Let's re-run the exact same insert test from verify-ai-card-backend.cjs but ONLY the db part and logging the error detail.

    const DEFAULT_LEAD_USER_ID = process.env.DEFAULT_LEAD_USER_ID || '75114b93-e1c8-4d54-9e43-dd557d9e3ad9';

    const payload = {
        user_id: DEFAULT_LEAD_USER_ID,
        full_name: 'Schema Check User',
        // Intentionally leaving out other fields to test nullability
        updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
        .from('ai_card_profiles')
        .upsert(payload, { onConflict: 'user_id' })
        .select('*')
        .single();

    if (error) {
        console.error('❌ Schema Check Failed:', error.message);
        if (error.details) console.error('Details:', error.details);

        if (error.message.includes('violates not-null constraint')) {
            console.log('\nCONCLUSION: The migration to fix NOT NULL constraints has NOT been applied.');
        } else if (error.message.includes('violates foreign key constraint')) {
            console.log('\nCONCLUSION: The migration to fix Foreign Key constraints has NOT been applied.');
        }
    } else {
        console.log('✅ Schema Check Passed: Row inserted with nulls.');
        console.log('The migration WAS applied successfully.');
    }
}

checkSchema();
