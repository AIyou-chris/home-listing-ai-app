const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function applyMigration() {
  if (!process.argv.includes('--yes')) {
    console.error('Refusing to run without --yes');
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected to database.');

    const sqlPath = path.resolve(
      __dirname,
      '../../backend/supabase-migrations/phase5_2_2_appointments_updated_at_trigger.sql'
    );
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query('BEGIN');
    const result = await client.query(sql);
    await client.query('COMMIT');

    console.log('✅ phase5_2_2_appointments_updated_at_trigger.sql applied');
    if (result?.rows?.[0]) {
      console.log('✅ Summary:', JSON.stringify(result.rows[0]));
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('❌ Failed to apply phase5_2_2_appointments_updated_at_trigger.sql');
    console.error(error.message || error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

applyMigration();
