
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from potential locations
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
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    console.log('Checked paths:', envPaths);
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyFunnels() {
    console.log('🔍 Verifying Funnel Restoration...');

    // 1. Check Funnels
    const { data: funnels, error: funnelsError } = await supabase
        .from('funnels')
        .select('*')
        .in('type', ['realtor', 'broker']);

    if (funnelsError) {
        console.error('❌ Error fetching funnels:', funnelsError);
        return;
    }

    console.log(`\nFound ${funnels.length} funnels:`);
    funnels.forEach(f => console.log(`- [${f.type}] ${f.name} (ID: ${f.id})`));

    // 2. Check Steps for each
    for (const funnel of funnels) {
        console.log(`\nchecking steps for ${funnel.name}...`);
        const { data: steps, error: stepsError } = await supabase
            .from('funnel_steps')
            .select('*')
            .eq('funnel_id', funnel.id)
            .order('step_index', { ascending: true });

        if (stepsError) {
            console.error('❌ Error fetching steps:', stepsError);
            continue;
        }

        console.log(`  Found ${steps.length} steps.`);
        steps.forEach(s => {
            console.log(`  - Step ${s.step_index}: ${s.step_name} (${s.action_type})`);
            if (s.content && s.content.includes('2 AM')) {
                console.log(`    ✅ CONFIRMED: Found "2 AM" content in this step!`);
            }
        });
    }
}

verifyFunnels();
