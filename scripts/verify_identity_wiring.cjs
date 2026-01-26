const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const API_URL = 'http://localhost:5001';
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyIdentityWiring() {
    console.log('🚀 Starting Identity Wiring Verification...');

    // 1. Find a test user
    const { data: users, error: userError } = await supabase.from('agents').select('auth_user_id, email').limit(1);
    if (userError || !users.length) {
        console.error('❌ Could not find a test agent');
        process.exit(1);
    }
    const testUser = users[0];
    const userId = testUser.auth_user_id;
    console.log(`✅ Using test user: ${testUser.email} (${userId})`);

    // 2. Test PUT /api/agent/identity
    console.log('📡 Testing PUT /api/agent/identity...');
    try {
        const payload = {
            senderName: 'Test Agent name',
            senderEmail: 'test@verified.com',
            replyTo: 'replies@test.com'
        };
        const putRes = await fetch(`${API_URL}/api/agent/identity`, {
            method: 'PUT',
            headers: {
                'x-user-id': userId,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        const putData = await putRes.json();
        console.log('✅ PUT successful:', putData.success);
    } catch (err) {
        console.error('❌ PUT failed:', err.message);
    }

    // 3. Test GET /api/agent/identity
    console.log('📡 Testing GET /api/agent/identity...');
    try {
        const getRes = await fetch(`${API_URL}/api/agent/identity`, {
            headers: { 'x-user-id': userId }
        });
        const getData = await getRes.json();
        console.log('✅ GET data:', getData);
        if (getData.sender_name === 'Test Agent name') {
            console.log('✅ Data verification PASSED');
        } else {
            console.log('❌ Data verification FAILED');
        }
    } catch (err) {
        console.error('❌ GET failed:', err.message);
    }

    // 4. Verify DB columns directly
    console.log('🗄️ Verifying DB storage...');
    const { data: agent, error: dbError } = await supabase
        .from('agents')
        .select('sender_name, sender_email, sender_reply_to')
        .eq('auth_user_id', userId)
        .single();

    if (dbError) {
        console.error('❌ DB Verification failed:', dbError.message);
    } else {
        console.log('✅ DB Values:', agent);
    }

    console.log('🏁 Verification complete.');
}

verifyIdentityWiring();
