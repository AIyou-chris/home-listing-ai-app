const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Load envs
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
} else {
    require('dotenv').config();
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
    console.log('Checking schema for ai_conversations...');

    // Try to insert a dummy record with the new columns to see if it errors
    // or check information_schema (if we had access, but RLS usually blocks)
    // Easiest is to select * limit 1 and see keys

    const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error selecting:', error);
        return;
    }

    if (data.length === 0) {
        console.log('Table exists but is empty. Cannot verify columns easily via SELECT *. attempting insert...');

        // Try insert with new column
        const { error: insertError } = await supabase
            .from('ai_conversations')
            .insert({
                // Minimal required fields? user_id is NOT NULL
                // We need a valid user_id. 
            })
        // Actually, better to just error on select if column doesn't exist? 
        // No, select * ignores missing columns in some clients? No, usually returns what's there.
    } else {
        console.log('Found row. Keys:', Object.keys(data[0]));
        if (Object.keys(data[0]).includes('voice_transcript')) {
            console.log('✅ voice_transcript column exists!');
        } else {
            console.error('❌ voice_transcript column MISSING. Migration not run?');
        }
    }
}

checkSchema();
