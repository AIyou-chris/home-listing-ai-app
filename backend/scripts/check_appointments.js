const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabaseAdmin
    .from('appointments')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ SQL ERROR:', error);
  } else {
    console.log('✅ COLUMNS:', Object.keys(data[0] || {}));
  }
}

check();
