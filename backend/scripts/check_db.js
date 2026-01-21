const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://yocchddxdsaldgsibmmc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvY2NoZGR4ZHNhbGRnc2libW1jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjU4MTA0OCwiZXhwIjoyMDcyMTU3MDQ4fQ.TbUVK8EVESZ6SYPjQjYjK2VXsoyUzdZe5hvDCciySxo'
);

async function check() {
  let output = '';
  try {
    const { data: lead, error: leadErr } = await supabase.from('leads').select('*').limit(1);
    output += 'LEADS: ' + (leadErr ? JSON.stringify(leadErr) : Object.keys(lead[0] || {}).join(', ')) + '\n';

    const { data: appt, error: apptErr } = await supabase.from('appointments').select('*').limit(1);
    output += 'APPT: ' + (apptErr ? JSON.stringify(apptErr) : Object.keys(appt[0] || {}).join(', ')) + '\n';
  } catch (e) {
    output += 'CATCH: ' + e.message + '\n';
  }
  fs.writeFileSync('db_check.txt', output);
}

check();
