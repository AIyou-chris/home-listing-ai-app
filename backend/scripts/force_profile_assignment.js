const apiKey = process.env.VITE_TELNYX_API_KEY || 'REDACTED_USE_ENV_VAR';
const { Telnyx } = require('../../node_modules/telnyx/index.js');
const telnyx = new Telnyx({ apiKey });

const APP_ID = '2897794484899153686';
const PROFILE_ID = '2860550674431607927'; // Default Profile ID found in previous step

async function forceAssign() {
    try {
        console.log(`🔌 Configuring App: ${APP_ID}`);
        console.log(`📝 Assigning Outbound Profile: ${PROFILE_ID}`);

        // Try updating with nested 'outbound' object
        const { data: updatedApp } = await telnyx.callControlApplications.update(APP_ID, {
            outbound: {
                outbound_voice_profile_id: PROFILE_ID
            }
        });

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

forceAssign();
