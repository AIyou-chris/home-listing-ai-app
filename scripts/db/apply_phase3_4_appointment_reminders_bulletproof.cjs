const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function applyPhase34AppointmentRemindersBulletproof() {
  const connectionString =
    process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to database.');

    const sqlPath = path.resolve(
      __dirname,
      '../../backend/supabase-migrations/phase3_4_appointment_reminders_bulletproof.sql'
    );
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query(sql);
    console.log('✅ phase3_4_appointment_reminders_bulletproof.sql applied');
  } catch (error) {
    console.error('❌ Failed to apply phase3_4_appointment_reminders_bulletproof.sql');
    console.error(error.message || error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

applyPhase34AppointmentRemindersBulletproof();
