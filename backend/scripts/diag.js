const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  'https://yocchddxdsaldgsibmmc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvY2NoZGR4ZHNhbGRnc2libW1jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjU4MTA0OCwiZXhwIjoyMDcyMTU3MDQ4fQ.TbUVK8EVESZ6SYPjQjYjK2VXsoyUzdZe5hvDCciySxo'
);

async function check() {
  console.log('--- LEADS ---');
  const { data: lead, error: leadErr } = await supabaseAdmin.from('leads').select('*').limit(1);
  if (leadErr) console.log('Leads Error:', leadErr);
  else console.log('Leads sample:', lead[0]);

  console.log('--- APPOINTMENTS ---');
  const { data: appt, error: apptErr } = await supabaseAdmin.from('appointments').select('*').limit(1);
  if (apptErr) console.log('Appts Error:', apptErr);
  else console.log('Appts sample:', appt[0]);
}

check();
