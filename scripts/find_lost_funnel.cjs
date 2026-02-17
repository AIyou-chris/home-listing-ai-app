
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const envPath = path.resolve(__dirname, '../.env');
console.log('Loading .env from:', envPath);
require('dotenv').config({ path: envPath });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function searchFunnelContent() {
    console.log('🔍 Searching DB for "3 AM showing"...');

    const { data: allFunnels } = await supabase.from('funnels').select('*');
    const matchedFunnels = (allFunnels || []).filter(f => JSON.stringify(f).toLowerCase().includes('3 am showing'));

    console.log(`Found ${matchedFunnels.length} in 'funnels' table:`);
    matchedFunnels.forEach(f => console.log(`- ID: ${f.id}, Name: ${f.name}, Key: ${f.funnel_key}`));

    // Check funnel_steps table
    const { data: steps } = await supabase
        .from('funnel_steps')
        .select('*')
        .ilike('email_body', '%3 AM showing%');

    console.log(`Found ${steps?.length || 0} in 'funnel_steps' table.`);
    steps?.forEach(s => console.log(`- Step ID: ${s.id}, Funnel ID: ${s.funnel_id}`));
}

searchFunnelContent();
