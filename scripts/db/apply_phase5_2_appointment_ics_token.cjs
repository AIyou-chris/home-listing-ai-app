const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function applyPhase52AppointmentIcsToken() {
  const connectionString =
    process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to database.');

    const sqlPath = path.resolve(
      __dirname,
      '../../backend/supabase-migrations/phase5_2_appointment_ics_token.sql'
    );
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query('BEGIN');

    // Execute statement-by-statement so we can capture the backfill count row.
    const statements = sql
      .split(';')
      .map((chunk) => chunk.trim())
      .filter(Boolean);

    let backfillCount = 0;

    for (const statement of statements) {
      const result = await client.query(statement);
      if (statement.toLowerCase().includes('updated_count') && result.rows?.[0]?.updated_count !== undefined) {
        backfillCount = Number(result.rows[0].updated_count || 0);
      }
    }

    await client.query('COMMIT');
    console.log('✅ phase5_2_appointment_ics_token.sql applied');
    console.log(`✅ Backfill updated rows: ${backfillCount}`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('❌ Failed to apply phase5_2_appointment_ics_token.sql');
    console.error(error.message || error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

applyPhase52AppointmentIcsToken();
