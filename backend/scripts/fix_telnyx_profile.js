const apiKey = process.env.VITE_TELNYX_API_KEY || 'REDACTED_USE_ENV_VAR';
const { Telnyx } = require('../../node_modules/telnyx/index.js');
const telnyx = new Telnyx({ apiKey });

const CONNECTION_ID = '2897794484899153686'; // The Hume AI Agent App ID

async function fixOutboundProfile() {
    try {
        console.log('🔍 Checking Outbound Voice Profiles...');
        const { data: profiles } = await telnyx.outboundVoiceProfiles.list();

        let profileId = null;

        if (profiles.length > 0) {
            console.log(`✅ Found ${profiles.length} existing profiles.`);
            profiles.forEach(p => console.log(`- ${p.name} (ID: ${p.id})`));
            profileId = profiles[0].id; // Use the first available one
        } else {
            console.log('⚠️ No Outbound Voice Profiles found. Creating one...');
            const { data: newProfile } = await telnyx.outboundVoiceProfiles.create({
                name: 'Hume AI Outbound',
                traffic_type: 'conversational', // or 'conversational'
                service_plan: 'global' // or 'us'
            });
            console.log(`✅ Created profile: ${newProfile.name} (${newProfile.id})`);
            profileId = newProfile.id;
        }

        try {
            // Try updating Connection on the Call Control Application object
            await telnyx.callControlApplications.update(CONNECTION_ID, {
                outbound_voice_profile_id: profileId,
                anchorsite_override: 'Latency',
                active: true,
                webhook_event_url: 'https://small-lemons-smile.loca.lt/api/voice/hume/connect'
            });
            console.log('✅ Updated Call Control Application with Outbound Profile!');

        } catch (err) {
            console.error('Failed to update Call Control App:', err.message);
            if (err.raw) console.error(err.raw);

            // Fallback: Try updating Connection Directly (if available as a resource)
            if (telnyx.connections && typeof telnyx.connections.update === 'function') {
                await telnyx.connections.update(CONNECTION_ID, {
                    outbound_voice_profile_id: profileId
                });
                console.log('✅ Updated Connection directly!');
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.raw) console.error(JSON.stringify(error.raw, null, 2));
    }
}

fixOutboundProfile();
