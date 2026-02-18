const fetch = require('node-fetch');
// Manually load env for this script since it's standalone
require('dotenv').config({ path: './.env' });

const VAPI_PRIVATE_KEY = process.env.VAPI_PRIVATE_KEY;
const TARGET_ID = '6681ff24-0c13-4bfd-ad2e-2670dc215027';

console.log('Checking for Assistant ID:', TARGET_ID);
console.log('Using Key ending in:', VAPI_PRIVATE_KEY ? VAPI_PRIVATE_KEY.slice(-4) : 'NONE');

async function checkAssistant() {
    try {
        const response = await fetch(`https://api.vapi.ai/assistant/${TARGET_ID}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Assistant FOUND!');
            console.log('Name:', data.name);
            console.log('ID:', data.id);
        } else {
            console.log('❌ Assistant NOT FOUND');
            console.log('Status:', response.status);
            const text = await response.text();
            console.log('Response:', text);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

checkAssistant();
