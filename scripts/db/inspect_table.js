const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function inspect() {
    console.log('Inspecting email_tracking_events...');
    const { data, error } = await supabaseAdmin.from('email_tracking_events').select('*').limit(1);
    if (error) console.error(error);
    else console.log('Keys:', Object.keys(data[0] || {}));

    // If empty, try to insert dummy to get error with column hint? 
    // Or just look at a migration file if I can find one.
    // Let's also check funnel_step_metrics columns
    const { data: mData } = await supabaseAdmin.from('funnel_step_metrics').select('*').limit(1);
    console.log('Metrics Keys:', Object.keys(mData[0] || {}));
}

inspect();
