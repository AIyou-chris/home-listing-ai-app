const apiKey = process.env.TELNYX_API_KEY || process.env.VITE_TELNYX_API_KEY;
const { Telnyx } = require('telnyx');
const telnyx = new Telnyx({ apiKey });

const APP_ID = process.env.TELNYX_CONNECTION_ID;

async function checkApp() {
    if (!apiKey) throw new Error('Missing TELNYX_API_KEY (or VITE_TELNYX_API_KEY).');
    if (!APP_ID) throw new Error('Missing TELNYX_CONNECTION_ID.');

    try {
        console.log(`🔍 Inspecting TeXML App: ${APP_ID}`);

        // Retrieve App Details
        const { data: app } = await telnyx.texmlApplications.retrieve(APP_ID);
        console.log(JSON.stringify(app, null, 2));

        console.log('\n---------------------------------\n');

        // Check Outbound Profiles
        console.log('🔍 Checking Available Outbound Profiles...');
        const { data: profiles } = await telnyx.outboundVoiceProfiles.list();
        profiles.forEach(p => console.log(`- ${p.name} (ID: ${p.id})`));

        const assignedProfileId = app.outbound?.outbound_voice_profile_id || app.outbound_voice_profile_id;
        if (!assignedProfileId) {
            console.error('\n❌ CRITICAL: No Outbound Voice Profile assigned to this App!');
        } else {
            console.log(`\n✅ Outbound Profile Assigned: ${assignedProfileId}`);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkApp();
