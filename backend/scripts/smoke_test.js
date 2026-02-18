const apiKey = process.env.TELNYX_API_KEY || process.env.VITE_TELNYX_API_KEY;
const { Telnyx } = require('telnyx');
const telnyx = new Telnyx({ apiKey });

const TO_NUMBER = process.env.TELNYX_TEST_NUMBER || '+12067551047'; // Default to user's number from screenshot
const FROM_NUMBER = process.env.TELNYX_PHONE_NUMBER || '+12069442374';
const CONNECTION_ID = process.env.TELNYX_CONNECTION_ID;
const PUBLIC_BASE_URL =
    process.env.VOICE_PUBLIC_BASE_URL ||
    process.env.PUBLIC_URL ||
    process.env.API_BASE_URL ||
    process.env.VITE_API_BASE_URL ||
    '';

async function smokeTest() {
    if (!apiKey) throw new Error('Missing TELNYX_API_KEY (or VITE_TELNYX_API_KEY).');
    if (!CONNECTION_ID) throw new Error('Missing TELNYX_CONNECTION_ID.');

    const webhookUrl = PUBLIC_BASE_URL
        ? `${PUBLIC_BASE_URL.replace(/\/+$/, '')}/api/voice/hume/connect`
        : null;

    console.log('🚀 Initiating Smoke Test Call...');
    console.log(`From: ${FROM_NUMBER}`);
    console.log(`To: ${TO_NUMBER}`);
    console.log(`App ID: ${CONNECTION_ID}`);
    if (webhookUrl) console.log(`TeXML URL: ${webhookUrl}`);

    try {
        // TeXML API Initiation
        const payload = {
            To: TO_NUMBER,
            From: FROM_NUMBER
        };
        if (webhookUrl) {
            payload.Url = webhookUrl;
            payload.UrlMethod = 'POST';
            payload.FallbackUrl = webhookUrl;
            payload.FallbackMethod = 'POST';
        }

        const response = await telnyx.texml.calls.initiate(
            CONNECTION_ID, // TeXML App ID
            payload
        );

        console.log('\n✅ SUCCESS! API Request Accepted.');
        // console.log(`Call Control ID: ${call.call_control_id}`);
        console.log(JSON.stringify(response, null, 2));
        console.log('If your phone is ringing, the connection is FULLY WORKING.');

        // Optionally hangup immediately to not annoy the user too much?
        // No, let it ring so they can answer and test Hume if they want.

    } catch (error) {
        console.error('\n❌ FAILED. Critical Error:');
        console.error(error.message);
        if (error.raw) {
            console.error('Details:', JSON.stringify(error.raw, null, 2));
        }
    }
}

smokeTest();
