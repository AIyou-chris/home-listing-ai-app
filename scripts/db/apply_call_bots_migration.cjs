const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function applyCallBotsMigration() {
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';
    const client = new Client({ connectionString });

    try {
        await client.connect();
        console.log('Connected:', connectionString);

        const sqlPath = path.resolve(__dirname, '../../backend/supabase-migrations/call_bots_table.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await client.query(sql);
        console.log('✅ call_bots_table.sql applied');
    } catch (error) {
        console.error('❌ Failed to apply call_bots_table.sql');
        console.error(error.message || error);
        process.exitCode = 1;
    } finally {
        await client.end();
    }
}

applyCallBotsMigration();
