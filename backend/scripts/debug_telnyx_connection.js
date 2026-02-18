const apiKey = process.env.VITE_TELNYX_API_KEY || 'REDACTED_USE_ENV_VAR';
const { Telnyx } = require('../../node_modules/telnyx/index.js');
const telnyx = new Telnyx({ apiKey });

const APP_ID = '2897794484899153686';

async function checkApp() {
    try {
        console.log(`🔍 Inspecting Call Control App: ${APP_ID}`);

        // Retrieve App Details
        const { data: app } = await telnyx.callControlApplications.retrieve(APP_ID);
        console.log(JSON.stringify(app, null, 2));

        console.log('\n---------------------------------\n');

        // Check Outbound Profiles
        console.log('🔍 Checking Available Outbound Profiles...');
        const { data: profiles } = await telnyx.outboundVoiceProfiles.list();
        profiles.forEach(p => console.log(`- ${p.name} (ID: ${p.id})`));

        if (!app.outbound_voice_profile_id) {
            console.error('\n❌ CRITICAL: No Outbound Voice Profile assigned to this App!');
        } else {
            console.log(`\n✅ Outbound Profile Assigned: ${app.outbound_voice_profile_id}`);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkApp();
