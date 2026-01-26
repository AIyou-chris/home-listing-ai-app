const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function runMigration() {
    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL is missing from .env. Cannot run migration directly.');
        console.log('💡 Please run the SQL file manually in your Supabase Dashboard SQL Editor:');
        console.log(`   File: ${path.resolve(__dirname, '../supabase-migrations/create-calendar-connections.sql')}`);
        process.exit(1);
    }

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
