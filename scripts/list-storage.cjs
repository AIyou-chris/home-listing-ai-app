require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function listFiles() {
    console.log('Listing files in ai-card-assets bucket...');

    // List root files
    const { data: rootFiles, error: rootError } = await supabaseAdmin.storage
        .from('ai-card-assets')
        .list();

    if (rootError) {
        console.error('Error listing root:', rootError);
    } else {
        // console.log('Root files:', rootFiles);

        // Check for "null" folder
        const nullFolder = rootFiles.find(f => f.name === 'null');
        if (nullFolder) {
            console.log('\nFOUND "null" FOLDER! Listing contents...');
            const { data: nullFiles } = await supabaseAdmin.storage
                .from('ai-card-assets')
                .list('null');
            console.log(nullFiles);
        }

        // Check for default user folder
        const DEFAULT_LEAD_USER_ID = process.env.DEFAULT_LEAD_USER_ID || '75114b93-e1c8-4d54-9e43-dd557d9e3ad9';
        console.log(`\nChecking default user folder (${DEFAULT_LEAD_USER_ID})...`);
        const { data: userFiles } = await supabaseAdmin.storage
            .from('ai-card-assets')
            .list(DEFAULT_LEAD_USER_ID);
        console.log(userFiles);
    }
}

listFiles();
