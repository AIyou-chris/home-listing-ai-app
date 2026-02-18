const apiKey = process.env.TELNYX_API_KEY || process.env.VITE_TELNYX_API_KEY;
const { Telnyx } = require('telnyx');
const telnyx = new Telnyx({ apiKey });

const PUBLIC_BASE_URL =
    process.env.VOICE_PUBLIC_BASE_URL ||
    process.env.PUBLIC_URL ||
    process.env.API_BASE_URL ||
    process.env.VITE_API_BASE_URL ||
    '';
const WEBHOOK_URL = `${PUBLIC_BASE_URL.replace(/\/+$/, '')}/api/voice/hume/connect`;
const APP_NAME = process.env.TELNYX_APP_NAME || 'Hume AI TeXML App';
const PROFILE_ID = process.env.TELNYX_OUTBOUND_PROFILE_ID;

async function switchContext() {
    if (!apiKey) throw new Error('Missing TELNYX_API_KEY (or VITE_TELNYX_API_KEY).');
    if (!PUBLIC_BASE_URL) throw new Error('Missing VOICE_PUBLIC_BASE_URL (or PUBLIC_URL/API_BASE_URL).');

    try {
        console.log('🔄 Switching to TeXML Application...');

        // 1. Create TeXML App
        console.log(`Creating TeXML App: ${APP_NAME}`);
        const { data: app } = await telnyx.texmlApplications.create({
            friendly_name: APP_NAME,
            voice_url: WEBHOOK_URL,
            voice_method: 'POST',
            voice_fallback_url: WEBHOOK_URL, // fallback to same for now
            status_callback: WEBHOOK_URL,
            status_callback_method: 'POST',
            active: true,
            anchorsite_override: 'Latency'
        });

        console.log(`✅ Created TeXML App! ID: ${app.id}`);

        // 2. Assign Outbound Profile
        console.log('🔍 Finding Outbound Profile...');
        const { data: profiles } = await telnyx.outboundVoiceProfiles.list();
        if (profiles.length > 0) {
            const profileId = PROFILE_ID || profiles[0].id;
            console.log(`Assigning Profile ${profileId} to TeXML App ${app.id}...`);
            await telnyx.texmlApplications.update(app.id, {
                outbound: {
                    outbound_voice_profile_id: profileId
                }
            });
            console.log('✅ Outbound Profile Assigned.');
        } else {
            console.error('❌ No Outbound Profile found!');
        }

        console.log('\n-----------------------------------');
        console.log('🎉 NEW CONNECTION ID:', app.id);
        console.log('-----------------------------------');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.raw) console.error(JSON.stringify(error.raw, null, 2));
    }
}

switchContext();
