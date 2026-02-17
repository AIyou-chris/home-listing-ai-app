import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const { Client } = pg;

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL not found in environment variables.');
    process.exit(1);
}

const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for Supabase in many cases
});

async function applyMigration() {
    try {
        await client.connect();
        console.log('✅ Connected to database.');

        const migrationPath = path.resolve(__dirname, '../../backend/supabase-migrations/revenue_system_v1.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('🚀 Applying revenue system migration...');
        await client.query(sql);

        console.log('✅ Migration applied successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

applyMigration();
