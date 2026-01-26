const { Client } = require('pg');
const fs = require('fs');
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

        const migrationPath = path.resolve(__dirname, '../supabase-migrations/add-sender-identity-columns.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('📜 Executing Migration...');
        await client.query(sql);

        console.log('✅ Migration Success: Added identity columns to agents table.');
    } catch (err) {
        console.error('❌ Migration Failed:', err);
    } finally {
        await client.end();
    }
}

runMigration();
