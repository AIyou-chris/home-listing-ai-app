
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkTracking() {
    console.log('--- Checking Email Tracking Events (Last 5) ---');

    const { data, error } = await supabase
        .from('email_tracking_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data.length === 0) {
        console.log('No tracking events found.');
    } else {
        data.forEach(event => {
            console.log('Event Keys:', Object.keys(event));
            console.log('Full Event:', JSON.stringify(event, null, 2));
            console.log('-----------------------------------');
        });
    }
}

checkTracking();
