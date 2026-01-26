const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const { parseCSVLine } = require('../utils/csvParser');

// Load Env
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.DANGEROUS_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    console.error('❌ Missing Env Vars');
    process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

async function runImport() {
    const csvPath = path.resolve(__dirname, '../../leads.csv');
    console.log(`🚀 Starting Manual Import from: ${csvPath}`);

    if (!fs.existsSync(csvPath)) {
        console.error('❌ File leads.csv not found in project root.');
        process.exit(1);
    }

    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = fileContent.split(/\r?\n/).filter(line => line.trim() !== '');

    if (lines.length < 2) {
        console.error('❌ CSV seems empty or missing header.');
        process.exit(1);
    }

    // Get Admin User
    const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    if (!users || users.length === 0) {
        console.error('❌ No admin user found.');
        process.exit(1);
    }
    const adminUser = users[0];
    console.log(`👤 Importing as Admin: ${adminUser.email}`);

    // Parse Headers
    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
    console.log('📋 Headers:', headers);

    const leads = [];
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);

        // Flexible Mapping
        const getName = () => {
            const idx = headers.findIndex(h => h.includes('name'));
            return idx !== -1 ? values[idx] : 'Unknown';
        };
        const getEmail = () => {
            const idx = headers.findIndex(h => h.includes('email') || h.includes('mail'));
            return idx !== -1 ? values[idx] : null;
        };
        const getPhone = () => {
            const idx = headers.findIndex(h => h.includes('phone') || h.includes('cell'));
            return idx !== -1 ? values[idx] : null;
        };

        const name = getName();
        const email = getEmail();
        const phone = getPhone();

        if (name && (email || phone)) {
            leads.push({
                user_id: adminUser.id,
                name: name,
                email: email,
                phone: phone,
                source: 'manual_csv_import',
                status: 'New',
                funnel_type: 'universal_sales', // Force Recruitment Funnel
                score: 10,
                created_at: new Date().toISOString()
            });
        } else {
            skipped++;
        }
    }

    console.log(`📦 Parsed ${leads.length} valid leads (${skipped} skipped).`);

    if (leads.length === 0) {
        console.log('⚠️ No valid leads to import.');
        return;
    }

    // Insert Leads
    const { data: insertedLeads, error: insertError } = await supabaseAdmin
        .from('leads')
        .insert(leads)
        .select();

    if (insertError) {
        console.error('❌ Insert Failed:', insertError);
        return;
    }
    console.log(`✅ Successfully inserted ${insertedLeads.length} leads.`);

    // Enroll in Funnel (universal_sales)
    console.log('⚙️ Enrolling in Recruitment Funnel...');
    const { data: funnel } = await supabaseAdmin.from('funnels').select('id, steps').eq('type', 'universal_sales').single();

    if (funnel) {
        const delay = funnel.steps?.[0]?.delay_minutes || 0;
        const enrollments = insertedLeads.map(l => ({
            agent_id: adminUser.id,
            lead_id: l.id,
            funnel_id: funnel.id,
            current_step_index: 0,
            status: 'active',
            next_run_at: new Date(Date.now() + delay * 60000).toISOString()
        }));

        const { error: enrollError } = await supabaseAdmin.from('funnel_enrollments').insert(enrollments);
        if (enrollError) {
            console.error('⚠️ Enrollment Failed:', enrollError);
        } else {
            console.log(`🎉 Enrolled ${enrollments.length} leads into Automation!`);
        }
    } else {
        console.warn('⚠️ Funnel "universal_sales" not found. Leads inserted but not enrolled.');
    }
}

runImport();
