
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
const envPaths = [
    path.resolve(__dirname, '../../.env.local'),
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../../backend/.env.local'),
    path.resolve(__dirname, '../../backend/.env')
];
envPaths.forEach(p => dotenv.config({ path: p }));

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testApi() {
    // 1. Get Admin User
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) {
        console.error('Error listing users:', error);
        return;
    }

    const admin = users.find(u => u.email && u.email.includes('homelistingai.com')) || users[0];
    if (!admin) {
        console.error('No admin user found');
        return;
    }

    console.log(`Testing API for user: ${admin.email} (${admin.id})`);

    // 2. Fetch API
    const apiUrl = `http://localhost:3002/api/funnels/${admin.id}`;
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        console.log('API Response Status:', response.status);

        if (data.funnels && data.funnels.realtor_funnel) {
            console.log('\n✅ realtor_funnel found with ' + data.funnels.realtor_funnel.length + ' steps!');
            data.funnels.realtor_funnel.forEach((step, index) => {
                console.log(`Step ${index + 1}: ${step.title} | Subject: "${step.subject}"`);
            });

            // Check for Market Alert
            const marketStep = data.funnels.realtor_funnel.find(s => s.title === 'Market Alert' || s.subject.includes('Market Alert'));
            if (marketStep) {
                console.log('\n🌟 SUCCESS: "Market Alert" step is present.');
            } else {
                console.error('\n❌ FAILURE: "Market Alert" step is MISSING.');
            }

        } else {
            console.log('❌ realtor_funnel NOT found in response');
            console.log('Funnels found:', Object.keys(data.funnels || {}));
        }

    } catch (err) {
        console.error('Fetch failed:', err);
    }
}

testApi();
