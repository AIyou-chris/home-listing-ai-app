const { createClient } = require('@supabase/supabase-js');
const createEmailService = require('./services/emailService');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '.env.local') });
dotenv.config();

// Init Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yocchddxdsaldgsibmmc.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const emailService = createEmailService(supabaseAdmin);

async function sendTestEmail() {
    console.log('🚀 Sending welcome email to homelistingai@gmail.com...');

    const result = await emailService.sendWelcomeEmail({
        to: 'homelistingai@gmail.com',
        firstName: 'HomeListingAI Team',
        dashboardUrl: 'https://homelistingai.com/admin-dashboard'
    });

    console.log('✅ Result:', result);
}

sendTestEmail();
