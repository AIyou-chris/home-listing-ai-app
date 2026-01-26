const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAgentColumns() {
    console.log('🕵️‍♂️ Checking Agents Table Columns...');
    const { data, error } = await supabase.from('agents').select('*').limit(1);

    if (error) {
        console.error('❌ Error fetching agents:', error.message);
        return;
    }

    if (data && data.length > 0) {
        const columns = Object.keys(data[0]);
        console.log('✅ Columns found:', columns);

        const required = ['voice_minutes_used', 'sms_sent_monthly', 'sender_name', 'sender_email', 'sender_reply_to'];
        required.forEach(col => {
            if (columns.includes(col)) {
                console.log(`✅ ${col}: EXISTS`);
            } else {
                console.log(`❌ ${col}: MISSING`);
            }
        });
    } else {
        console.log('⚠️ No agents found to check columns.');
    }
}

checkAgentColumns();
