const apiKey = process.env.TELNYX_API_KEY || process.env.VITE_TELNYX_API_KEY;
const { Telnyx } = require('telnyx');
const telnyx = new Telnyx({ apiKey });

const APP_ID = process.env.TELNYX_CONNECTION_ID || '2898148924659336874';
const PROFILE_ID = process.env.TELNYX_OUTBOUND_PROFILE_ID || '2860550674431607927';
const RENDER_URL = 'https://home-listing-ai-backend.onrender.com';
const WEBHOOK_URL = `${RENDER_URL}/api/voice/hume/connect`;

async function updateTeXMLApp() {
    try {
        console.log(`🔧 Updating TeXML App: ${APP_ID}`);
        console.log(`🌐 Webhook URL: ${WEBHOOK_URL}`);
        console.log(`📝 Outbound Profile: ${PROFILE_ID}`);

        const { data: updatedApp } = await telnyx.texmlApplications.update(APP_ID, {
            voice_url: WEBHOOK_URL,
            voice_method: 'POST',
            voice_fallback_url: WEBHOOK_URL,
            voice_fallback_method: 'POST',
            outbound: {
                outbound_voice_profile_id: PROFILE_ID
            }
        });

        console.log('\n✅ TeXML App Updated Successfully!');
        console.log(`Voice URL: ${updatedApp.voice_url}`);
        console.log(`Outbound Profile: ${updatedApp.outbound?.outbound_voice_profile_id}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.raw) console.error(JSON.stringify(error.raw, null, 2));
    }
}

updateTeXMLApp();
