const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function tryRpcMigration() {
    console.log('🧪 Attempting to run migration via RPC...');

    const migrationPath = path.resolve(__dirname, '../supabase-migrations/add-sender-identity-columns.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    try {
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
        if (error) {
            console.error('❌ RPC Failed:', error.message);
            console.log('💡 Note: This is expected if "exec_sql" function is not set up.');
        } else {
            console.log('✅ RPC Success! Migration applied.');
            process.exit(0);
        }
    } catch (err) {
        console.error('❌ RPC Exception:', err.message);
    }
    process.exit(1);
}

tryRpcMigration();
