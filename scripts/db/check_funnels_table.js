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

async function checkTable() {
    console.log('Checking funnels table via REST API...');
    const { data, error } = await supabase
        .from('funnels')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error querying funnels:', error.message);
        if (error.code === '42P01') { // PostgreSQL code for undefined table
            console.log('Result: Table does NOT exist.');
        } else {
            console.log('Result: Error interacting with table.');
        }
    } else {
        console.log('Result: Table EXISTS.');
        console.log('Data sample:', data);
    }
}

checkTable();
