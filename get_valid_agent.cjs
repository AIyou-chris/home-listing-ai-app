const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: ['.env.local', '.env', 'backend/.env'] });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    // Find an agent where the auth_user_id exists
    // We'll join with auth.users or just try to fetch the first few agents and see which one we can find in auth
    const { data: agents } = await supabaseAdmin.from('agents').select('slug, auth_user_id').limit(10);

    for (const agent of agents) {
        const { data: user } = await supabaseAdmin.auth.admin.getUserById(agent.auth_user_id);
        if (user.user) {
            console.log(`VALID_SLUG=${agent.slug}`);
            process.exit(0);
        }
    }
    console.log('NO_VALID_AGENT_FOUND');
}

main();
