const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function applyPhase32RealtimeCommandCenter() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to database.');

    const sqlPath = path.resolve(__dirname, '../../backend/supabase-migrations/phase3_2_realtime_command_center.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query(sql);
    console.log('✅ phase3_2_realtime_command_center.sql applied');
  } catch (error) {
    console.error('❌ Failed to apply phase3_2_realtime_command_center.sql');
    console.error(error.message || error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

applyPhase32RealtimeCommandCenter();
