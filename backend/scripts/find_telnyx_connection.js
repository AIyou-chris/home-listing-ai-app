const { Telnyx } = require('telnyx');
const apiKey = 'REDACTED_USE_ENV_VAR';
if (!apiKey) {
    console.error('VITE_TELNYX_API_KEY not found');
    process.exit(1);
}

// Standard initialization
const telnyx = require('telnyx')(apiKey);

async function findConnection() {
    try {
        const { data: connections } = await telnyx.connections.list();
        console.log('Connections found:', connections.length);
        connections.forEach(c => {
            console.log(`- Name: ${c.connection_name}, ID: ${c.id}, Type: ${c.connection_type}, Status: ${c.active ? 'Active' : 'Inactive'}`);
        });

        // Check Balance
        const { data: balance } = await telnyx.balance.retrieve();
        console.log(`\nBalance: ${balance.balance} ${balance.currency}`);

        // List All Numbers
        const { data: allNumbers } = await telnyx.phoneNumbers.list();
        console.log(`\nNumbers found: ${allNumbers.length}`);
        allNumbers.forEach(n => {
            console.log(`- ${n.phone_number} (ID: ${n.id}, Connection: ${n.connection_id})`);
        });
        // Check Calls Resource
        if (telnyx.calls) {
            console.log('\n✅ telnyx.calls resource exists.');
            if (typeof telnyx.calls.create === 'function') {
                console.log('✅ telnyx.calls.create is a function.');
            } else {
                console.error('❌ telnyx.calls.create is MISSING or not a function!');
                console.log('Available methods on telnyx.calls:', Object.keys(telnyx.calls));
            }
        } else {
            console.error('❌ telnyx.calls resource is MISSING!');
            console.log('Available resources on telnyx:', Object.keys(telnyx));
        }
    } catch (e) {
        console.error('Error listing connections:', e.message);
        if (e.raw) console.error('Raw Error:', JSON.stringify(e.raw, null, 2));
    }
}

findConnection();
