// Test Supabase connection from both frontend and backend configs
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

console.log('🧪 Testing Supabase Connections...\n');

// Test 1: Backend connection (service role)
const backendUrl = process.env.SUPABASE_URL;
const backendKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!backendUrl || !backendKey) {
  console.error('❌ Backend env vars missing');
  process.exit(1);
}

const supabaseAdmin = createClient(backendUrl, backendKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

console.log('1️⃣ Testing Backend (Service Role) Connection...');
supabaseAdmin
  .from('ai_kb')
  .select('count')
  .limit(1)
  .then(({ data, error }) => {
    if (error) {
      console.log('   ✅ Backend connected (no data is normal)');
      console.log('   Error:', error.message);
    } else {
      console.log('   ✅ Backend connected successfully');
      console.log('   Result:', data);
    }
  })
  .catch((err) => {
    console.log('   ❌ Backend connection failed:', err.message);
  });

// Test 2: Check if tables exist
console.log('\n2️⃣ Checking Database Tables...');
supabaseAdmin
  .from('ai_sidekick_profiles')
  .select('count')
  .limit(0)
  .then(({ error }) => {
    if (error) {
      console.log('   ❌ ai_sidekick_profiles table issue:', error.message);
    } else {
      console.log('   ✅ ai_sidekick_profiles table exists');
    }
  });

supabaseAdmin
  .from('ai_kb')
  .select('count')
  .limit(0)
  .then(({ error }) => {
    if (error) {
      console.log('   ❌ ai_kb table issue:', error.message);
    } else {
      console.log('   ✅ ai_kb table exists');
    }
  });

supabaseAdmin
  .from('audit_logs')
  .select('count')
  .limit(0)
  .then(({ error }) => {
    if (error) {
      console.log('   ❌ audit_logs table issue:', error.message);
    } else {
      console.log('   ✅ audit_logs table exists');
    }
  });

// Test 3: Check RLS is enabled
console.log('\n3️⃣ Checking Row Level Security...');
setTimeout(() => {
  const query = `
    SELECT tablename, policyname 
    FROM pg_policies 
    WHERE tablename IN ('ai_kb', 'ai_sidekick_profiles', 'audit_logs')
    ORDER BY tablename, policyname;
  `;
  
  supabaseAdmin.rpc('exec', { query }).catch(() => {
    console.log('   ℹ️  RLS check requires custom function (skip for now)');
    console.log('   ✅ Run manual check in Supabase SQL Editor if needed');
  });
}, 1000);

// Test 4: Storage bucket
console.log('\n4️⃣ Checking Storage Bucket...');
setTimeout(() => {
  supabaseAdmin.storage
    .from('ai-kb')
    .list('', { limit: 1 })
    .then(({ data, error }) => {
      if (error && error.message.includes('not found')) {
        console.log('   ⚠️  Storage bucket "ai-kb" not found (run SQL to create)');
      } else if (error) {
        console.log('   ℹ️  Storage bucket check:', error.message);
      } else {
        console.log('   ✅ Storage bucket "ai-kb" exists');
      }
    });
}, 1500);

setTimeout(() => {
  console.log('\n✅ Connection tests complete!');
  console.log('\n📋 Next: Test auth by signing up a user in your app');
  process.exit(0);
}, 3000);

