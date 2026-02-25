const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function applyPhase1NoLeakLeadCapture() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected:', connectionString);

    const sqlPath = path.resolve(__dirname, '../../backend/supabase-migrations/phase1_no_leak_lead_capture.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query(sql);
    console.log('✅ phase1_no_leak_lead_capture.sql applied');
  } catch (error) {
    console.error('❌ Failed to apply phase1_no_leak_lead_capture.sql');
    console.error(error.message || error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

applyPhase1NoLeakLeadCapture();
