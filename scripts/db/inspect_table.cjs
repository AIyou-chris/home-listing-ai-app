const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function inspect() {
    console.log('Inspecting email_tracking_events...');
    // Create a dummy record and fail to see error message about missing columns? 
    // Or just select LIMIT 1.
    const { data, error } = await supabaseAdmin.from('email_tracking_events').select('*').limit(1);

    if (error) {
        console.error('Select Error:', error);
    } else if (data && data.length > 0) {
        console.log('Keys:', Object.keys(data[0]));
    } else {
        console.log('Table empty. Trying to insert invalid row to get column hints...');
        const { error: iError } = await supabaseAdmin.from('email_tracking_events').insert({ invalid_col: 'test' });
        if (iError) console.log('Insert Error (Expect this):', iError);
    }
}

inspect();
