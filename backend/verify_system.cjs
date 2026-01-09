const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
// IMPORTANT: We need SERVICE_ROLE_KEY to generate links/delete users cleanly
// But if we don't have it, we can still test the anon flow via signUp
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

console.log('🔍 Config Check:');
console.log('URL:', supabaseUrl ? 'OK' : 'MISSING');
console.log('ANON KEY:', supabaseKey ? 'OK' : 'MISSING');
console.log('SERVICE KEY:', serviceRoleKey ? 'OK' : 'MISSING (Limited Test)');

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing core Supabase config.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const adminClient = serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

async function runTest() {
    console.log('\n🧪 STARTING SYSTEM VERIFICATION...');
    const testEmail = `test_auto_${Date.now()}@example.com`;
    const testPassword = 'Password123!';
    let userId = null;

    try {
        // 1. Connectivity Check
        console.log('1. Checking Connection...');
        const { error: pingError } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
        if (pingError && pingError.code !== 'PGRST116') { // Ignore "no rows" errors, look for connection errors
            console.log('   ⚠️ Read check failed (might be RLS):', pingError.message);
        } else {
            console.log('   ✅ Connection OK');
        }

        // 2. Create User
        console.log(`2. Creating Test User (${testEmail})...`);
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword
        });

        if (signUpError) throw new Error(`SignUp Failed: ${signUpError.message}`);
        userId = signUpData.user?.id;
        console.log('   ✅ User Created:', userId);

        // 3. Generate Pasword Reset Link (Requires Admin)
        if (adminClient) {
            console.log('3. Generating Reset Link (Admin Mode)...');
            const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
                type: 'recovery',
                email: testEmail
            });

            if (linkError) throw new Error(`Link Gen Failed: ${linkError.message}`);
            console.log('   ✅ Link Generated:', linkData.properties.action_link);

            // 4. VERIFY RECOVERY FLOW (The Core Issue)
            console.log('4. Testing Password Update via Recovery Token...');
            const accessToken = linkData.properties.action_link.split('access_token=')[1].split('&')[0];
            const refreshToken = linkData.properties.action_link.split('refresh_token=')[1]?.split('&')[0]; // might not be there depending on link type

            // Client-side simulation
            // We need to set the session using the token
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || 'dummy' // Sometimes only access token is needed for magic link? No, recovery needs hash.
            });

            if (sessionError) throw new Error(`Session Set Failed: ${sessionError.message}`);
            console.log('   ✅ Session Established via Token');

            // UPDATE PASSWORD
            const newPassword = 'NewPassword789!';
            const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

            if (updateError) throw new Error(`UpdateUser Failed: ${updateError.message}`);
            console.log('   ✅ Password Updated Successfully!');

        } else {
            console.log('   ⚠️ Skipping Reset Link test (No Service Role Key).');
            // Can't fully test the reset flow without admin rights to generate link
            // But we proved we can talk to Auth API via SignUp
        }

    } catch (err) {
        console.error('\n❌ TEST FAILED:', err.message);
        process.exit(1);
    } finally {
        // Cleanup
        if (userId && adminClient) {
            console.log('\n🧹 Cleaning up test user...');
            const { error: delError } = await adminClient.auth.admin.deleteUser(userId);
            if (delError) console.error('   ⚠️ Cleanup failed:', delError.message);
            else console.log('   ✅ User deleted.');
        }
    }
}

runTest();
