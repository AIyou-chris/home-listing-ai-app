const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://yocchddxdsaldgsibmmc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvY2NoZGR4ZHNhbGRnc2libW1jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjU4MTA0OCwiZXhwIjoyMDcyMTU3MDQ4fQ.TbUVK8EVESZ6SYPjQjYjK2VXsoyUzdZe5hvDCciySxo'
);

async function check() {
  try {
    const { data, error } = await supabase.from('leads').select('funnel_type');
    if (error) {
       fs.writeFileSync('funnel_check.txt', 'ERR: ' + error.message);
       return;
    }
    const types = [...new Set(data.map(d => d.funnel_type))];
    fs.writeFileSync('funnel_check.txt', 'TYPES: ' + types.join(', '));
  } catch (e) {
    fs.writeFileSync('funnel_check.txt', 'CATCH: ' + e.message);
  }
}

check();
