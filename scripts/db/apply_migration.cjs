
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: 'backend/.env' });

async function applyMigration() {
    // Try standard Supabase local dev port 54322 first, then 5432
    // Or use DATABASE_URL from env if available
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';

    console.log(`Connecting to: ${connectionString}`);
    const client = new Client({ connectionString });

    try {
        await client.connect();
        console.log('✅ Connected to database');

        const sqlPath = path.join(__dirname, '../../backend/supabase-migrations/restore_funnels.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Executing SQL...');
        await client.query(sql);
        console.log('✅ Migration applied successfully.');

    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await client.end();
    }
}

applyMigration();
