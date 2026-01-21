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
  console.log('--- LEADS TABLE ---');
  const { data: lead, error: leadErr } = await supabaseAdmin.from('leads').select('*').limit(1);
  if (leadErr) console.error('Leads Error:', leadErr);
  else console.log('Leads Columns:', Object.keys(lead[0] || {}));

  console.log('--- APPOINTMENTS TABLE ---');
  const { data: appt, error: apptErr } = await supabaseAdmin.from('appointments').select('*').limit(1);
  if (apptErr) console.error('Appts Error:', apptErr);
  else console.log('Appts Columns:', Object.keys(appt[0] || {}));
}

check();
