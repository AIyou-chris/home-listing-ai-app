const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function applyMigration() {
  const shouldRun = process.argv.includes('--yes');
  if (!shouldRun) {
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
      '../../backend/supabase-migrations/phase5_2_1_fix_appointments_schema.sql'
    );
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query('BEGIN');
    const result = await client.query(sql);
    await client.query('COMMIT');

    const summary = result?.rows?.[result.rows.length - 1] || result?.rows?.[0] || null;
    console.log('✅ phase5_2_1_fix_appointments_schema.sql applied');
    if (summary) {
      console.log('✅ Summary:', JSON.stringify(summary));
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('❌ Failed to apply phase5_2_1_fix_appointments_schema.sql');
    console.error(error.message || error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

applyMigration();
