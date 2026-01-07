const fetch = require('node-fetch');
const crypto = require('crypto');

// CONFIG
const API_BASE = 'https://home-listing-ai-backend.onrender.com';
// Generate a VALID UUID to pass backend regex validation
const TEST_USER_ID = crypto.randomUUID ? crypto.randomUUID() : '12345678-1234-4321-8888-1234567890ab';
const SEQUENCE_ID = 'universal_sales';

async function runSmokeTest() {
    console.log('🔥 STARTING SMOKE TEST');
    console.log(`👤 User ID: ${TEST_USER_ID}`);
    console.log(`🌐 API: ${API_BASE}`);

    // 0. CONFIG CHECK
    console.log('\n--- STEP 0: CONFIG CHECK ---');
    try {
        const configRes = await fetch(`${API_BASE}/api/admin/debug-config-check`);
        if (configRes.ok) {
            const config = await configRes.json();
            console.log('SERVER CONFIG:', JSON.stringify(config, null, 2));
            if (!config.hasServiceKey || config.isServiceKeySameAsAnon) {
                console.error('❌ CRITICAL CONFIG ERROR: Service Key is missing or identical to Anon Key.');
            } else {
                console.log('✅ CONFIG OK: Service Key detected and distinct.');
            }
        } else {
            console.warn('⚠️ Config endpoint not reached (might be deploying?) Status:', configRes.status);
        }
    } catch (e) {
        console.warn('⚠️ Config check failed (network/parsing):', e.message);
    }

    // 1. PUT (Save Data)
    console.log('\n--- STEP 1: WRITING DATA (PUT) ---');
    const testPayload = {
        id: SEQUENCE_ID,
        name: "Smoke Test Sequence",
        steps: [
            { id: "step-1", title: `Written at ${new Date().toISOString()}`, type: "Email" }
        ]
    };

    try {
        const putRes = await fetch(`${API_BASE}/api/admin/marketing/sequences/${SEQUENCE_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': TEST_USER_ID
            },
            body: JSON.stringify(testPayload)
        });

        console.log(`PUT Status: ${putRes.status}`);
        if (!putRes.ok) {
            console.error('PUT Failed:', await putRes.text());
            process.exit(1);
        }
        console.log('✅ PUT Successful');

    } catch (e) {
        console.error('PUT Network Error:', e);
        process.exit(1);
    }

    // 2. GET (Read Data)
    console.log('\n--- STEP 2: READING DATA (GET) ---');
    try {
        const getRes = await fetch(`${API_BASE}/api/admin/marketing/sequences/${SEQUENCE_ID}`, {
            method: 'GET',
            headers: {
                'x-user-id': TEST_USER_ID
            }
        });

        console.log(`GET Status: ${getRes.status}`);

        // Check Headers
        const cacheControl = getRes.headers.get('cache-control');
        console.log(`Header [Cache-Control]: ${cacheControl}`);

        if (!cacheControl || !cacheControl.includes('no-store')) {
            console.error('❌ FAIL: Cache-Control header missing or incorrect');
        } else {
            console.log('✅ PASS: Cache-Control header present');
        }

        if (!getRes.ok) {
            console.error('GET Failed:', await getRes.text());
            process.exit(1);
        }

        const data = await getRes.json();
        console.log('GET Data title:', data.steps?.[0]?.title);

        if (data.steps?.[0]?.title === testPayload.steps[0].title) {
            console.log('✅ PASS: Data integrity verified (Read matches Write)');
        } else {
            console.error('❌ FAIL: Data mismatch!');
        }

    } catch (e) {
        console.error('GET Network Error:', e);
        process.exit(1);
    }

    // 3. OPTIONS (CORS Check)
    console.log('\n--- STEP 3: CORS CHECK (OPTIONS) ---');
    try {
        const optRes = await fetch(`${API_BASE}/api/admin/marketing/sequences/${SEQUENCE_ID}`, {
            method: 'OPTIONS',
            headers: {
                'Origin': 'https://homelistingai.com',
                'Access-Control-Request-Method': 'PUT',
                'Access-Control-Request-Headers': 'x-user-id'
            }
        });

        const allowHeaders = optRes.headers.get('access-control-allow-headers');
        console.log(`Header [Access-Control-Allow-Headers]: ${allowHeaders}`);

        if (allowHeaders && allowHeaders.includes('x-user-id')) {
            console.log('✅ PASS: x-user-id is allowed');
        } else {
            console.error('❌ FAIL: x-user-id NOT allowed in CORS');
        }

    } catch (e) {
        console.error('OPTIONS Network Error:', e);
    }

    console.log('\n🏁 SMOKE TEST COMPLETE');
}

runSmokeTest();
