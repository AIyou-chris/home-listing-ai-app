const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function runMigration() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('🔌 Connected to Database');

        await client.query(`
            ALTER TABLE leads 
            ADD COLUMN IF NOT EXISTS company TEXT;
        `);

        console.log('✅ Migration Success: Added company column to leads table.');
    } catch (err) {
        console.error('❌ Migration Failed:', err);
    } finally {
        await client.end();
    }
}

runMigration();
