
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
    console.log('Starting Admin Funnels Setup...');

    // 1. Get Admin User
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) throw userError;

    const adminEmail = 'us@homelistingai.com';
    const adminUser = users.find(u => u.email === adminEmail);

    if (!adminUser) {
        console.error(`Admin user ${adminEmail} not found!`);
        // Fallback to find ANY admin user or just fail
        console.log('Available users:', users.map(u => u.email));
        return;
    }

    console.log(`Found Admin User: ${adminUser.id} (${adminUser.email})`);
    const userId = adminUser.id;

    // 2. Rename 'Marketing Funnel' -> 'Realtor'
    // Note: Using 'agent_id' based on schema inspection
    const { data: marketingFunnels, error: findError } = await supabase
        .from('funnels')
        .select('*')
        .eq('agent_id', userId)
        .eq('name', 'Marketing Funnel');

    if (findError) throw findError;

    if (marketingFunnels && marketingFunnels.length > 0) {
        console.log('Renaming "Marketing Funnel" to "Realtor"...');
        const { error: updateError } = await supabase
            .from('funnels')
            .update({ name: 'Realtor' })
            .eq('id', marketingFunnels[0].id);

        if (updateError) throw updateError;
        console.log('✅ Renamed successfully.');
    } else {
        // Check if 'Realtor' already exists
        const { data: realtorFunnels } = await supabase
            .from('funnels')
            .select('*')
            .eq('agent_id', userId)
            .eq('name', 'Realtor');

        if (!realtorFunnels || realtorFunnels.length === 0) {
            console.log('Creating "Realtor" funnel...');
            // Default steps for Realtor funnel (same as likely marketing funnel)
            const realtorSteps = [
                { id: 'step1', name: 'Introduction', type: 'email', delay: 0, content: 'Welcome to our agency...' },
                { id: 'step2', name: 'Follow-up', type: 'sms', delay: 1440, content: 'Did you see my email?' }
            ];

            const { error: insertRealtorError } = await supabase
                .from('funnels')
                .insert({
                    agent_id: userId,
                    name: 'Realtor',
                    funnel_key: 'realtor', // Unique key
                    steps: realtorSteps,
                    is_default: false,
                    version: 1
                });
            if (insertRealtorError) console.error('Error creating Realtor funnel:', insertRealtorError);
            else console.log('✅ Created "Realtor" funnel.');
        } else {
            console.log('ℹ️ "Realtor" funnel already exists.');
        }
    }

    // 3. Create 'Broker' Funnel if missing
    const { data: brokerFunnels, error: findBrokerError } = await supabase
        .from('funnels')
        .select('*')
        .eq('agent_id', userId)
        .eq('name', 'Broker');

    if (findBrokerError) throw findBrokerError;

    if (!brokerFunnels || brokerFunnels.length === 0) {
        console.log('Creating "Broker" funnel...');

        // 4 Steps for Broker
        const brokerSteps = [
            { id: 'b_step1', name: 'Intro', type: 'email', delay: 0, content: 'Initial Broker Introduction' },
            { id: 'b_step2', name: 'Value Add', type: 'email', delay: 2880, content: 'Broker Value Proposition' }, // 2 days
            { id: 'b_step3', name: 'Follow-up', type: 'sms', delay: 5760, content: 'Broker Follow-up' }, // 4 days
            { id: 'b_step4', name: 'Close', type: 'call', delay: 10080, content: 'Broker Closing Call' } // 7 days
        ];

        const { error: insertBrokerError } = await supabase
            .from('funnels')
            .insert({
                agent_id: userId,
                name: 'Broker',
                funnel_key: 'broker',
                steps: brokerSteps,
                is_default: false,
                version: 1
            });

        if (insertBrokerError) throw insertBrokerError;
        console.log('✅ Created "Broker" funnel with 4 steps.');

    } else {
        console.log('ℹ️ "Broker" funnel already exists.');
    }

}

applyMigration().catch(console.error);
