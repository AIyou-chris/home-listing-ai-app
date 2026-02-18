const WebSocket = require('ws');

const publicBaseUrl =
    process.env.VOICE_PUBLIC_BASE_URL ||
    process.env.PUBLIC_URL ||
    process.env.API_BASE_URL ||
    process.env.VITE_API_BASE_URL ||
    '';
const wsBase = publicBaseUrl.replace(/^http:\/\//, 'ws://').replace(/^https:\/\//, 'wss://').replace(/\/+$/, '');
const wsUrl = `${wsBase}/api/voice/hume/stream?call_id=test-call`;

if (!publicBaseUrl) {
    throw new Error('Missing VOICE_PUBLIC_BASE_URL (or PUBLIC_URL/API_BASE_URL).');
}

console.log(`Connecting to ${wsUrl}...`);

const ws = new WebSocket(wsUrl);

ws.on('open', () => {
    console.log('✅ Connected!');
    ws.close();
});

ws.on('error', (err) => {
    console.error('❌ Error:', err.message);
});

ws.on('upgrade', (res) => {
    console.log('🔄 Upgrade response received');
});
