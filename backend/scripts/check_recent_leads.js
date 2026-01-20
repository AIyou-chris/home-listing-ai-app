const path = require('path');
const dotenv = require('dotenv');

// Load env from root
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

async function checkLeads() {
    // Check for leads created in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data, error, count } = await supabaseAdmin
        .from('leads')
        .select('*', { count: 'exact' })
        .gte('created_at', oneHourAgo)
        .neq('source', 'SmokeTest') // Filter out my smoke tests
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error fetching leads:', error);
        return;
    }

    console.log(`\n📊 Status Update: Found ${count} leads created in the last 1 hour.`);

    if (data && data.length > 0) {
        console.log('Most recent 5 imports:');
        data.slice(0, 5).forEach(l => {
            console.log(`- ${l.name} (${l.email}) | ${l.created_at} | Status: ${l.status}`);
        });
    } else {
        console.log('No recent leads found. If you just uploaded, they might be processing or the import failed silently.');
    }
}

checkLeads();
