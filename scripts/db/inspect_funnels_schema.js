import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectFunnels() {
    console.log('Inspecting funnels table schema...');

    // Fetch a sample row to see column names and types (indirectly)
    const { data, error } = await supabase
        .from('funnels')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error querying funnels:', error);
    } else {
        console.log('Success. Sample row keys:', data.length > 0 ? Object.keys(data[0]) : 'No rows found');
        if (data.length > 0) {
            console.log('Sample Row:', data[0]);
        }
    }
}

inspectFunnels();
