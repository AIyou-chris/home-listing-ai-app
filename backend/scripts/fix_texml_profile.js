const apiKey = process.env.TELNYX_API_KEY || process.env.VITE_TELNYX_API_KEY;
const { Telnyx } = require('telnyx');
const telnyx = new Telnyx({ apiKey });

const APP_ID = process.env.TELNYX_CONNECTION_ID;
const PROFILE_ID = process.env.TELNYX_OUTBOUND_PROFILE_ID;
const PUBLIC_BASE_URL =
    process.env.VOICE_PUBLIC_BASE_URL ||
    process.env.PUBLIC_URL ||
    process.env.API_BASE_URL ||
    process.env.VITE_API_BASE_URL ||
    '';

async function fixTeXMLProfile() {
    if (!apiKey) throw new Error('Missing TELNYX_API_KEY (or VITE_TELNYX_API_KEY).');
    if (!APP_ID) throw new Error('Missing TELNYX_CONNECTION_ID.');
    if (!PROFILE_ID) throw new Error('Missing TELNYX_OUTBOUND_PROFILE_ID.');

    try {
        console.log(`🔌 Configuring TeXML App: ${APP_ID}`);
        console.log(`📝 Assigning Outbound Profile: ${PROFILE_ID}`);

        const updatePayload = {
            outbound: {
                outbound_voice_profile_id: PROFILE_ID
            }
        };

        if (PUBLIC_BASE_URL) {
            const base = PUBLIC_BASE_URL.replace(/\/+$/, '');
            const webhookUrl = `${base}/api/voice/hume/connect`;
            updatePayload.inbound = {
                voice_url: webhookUrl,
                voice_method: 'POST',
                voice_fallback_url: webhookUrl,
            };
            updatePayload.status_callback = webhookUrl;
            updatePayload.status_callback_method = 'POST';
        }

        const { data: updatedApp } = await telnyx.texmlApplications.update(APP_ID, updatePayload);

        console.log('\n✅ Update Request Sent.');

        // Verify
        if (updatedApp.outbound && updatedApp.outbound.outbound_voice_profile_id === PROFILE_ID) {
            console.log('🎉 SUCCESS! Profile is now assigned.');
        } else {
            console.error('❌ FAILED. Profile ID mismatch or missing in response.');
            console.log(JSON.stringify(updatedApp.outbound, null, 2));
        }

    } catch (error) {
        console.error('❌ Error during update:', error.message);
        if (error.raw) console.error(JSON.stringify(error.raw, null, 2));
    }
}

fixTeXMLProfile();
