
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectSchema() {
    const { data, error } = await supabase
        .from('funnels')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching funnels:', error);
    } else {
        if (data && data.length > 0) {
            console.log('Sample Funnel Keys:', Object.keys(data[0]));
        } else {
            console.log('No funnels found to inspect keys from. Attempting to insert dummy to see error or just guessing.');
            // If table is empty, we can't see keys. But user said "wrong funnels", implying some exist.
        }
    }
}

inspectSchema();
