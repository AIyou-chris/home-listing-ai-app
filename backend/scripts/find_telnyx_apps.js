const apiKey = process.env.VITE_TELNYX_API_KEY || 'REDACTED_USE_ENV_VAR';
const { Telnyx } = require('../../node_modules/telnyx/index.js');
const telnyx = new Telnyx({ apiKey });

async function listApps() {
    try {
        console.log('Fetching Call Control Applications...');
        const { data: apps } = await telnyx.callControlApplications.list();

        console.log(`Found ${apps.length} applications.`);
        apps.forEach(app => {
            console.log(`\nName: ${app.application_name}`);
            console.log(`ID: ${app.id}`);
            console.log(`Webhook URL: ${app.webhook_event_url}`);
            console.log(`Active: ${app.active}`);
        });

        if (apps.length === 0) {
            console.log('\n⚠️ No Call Control Applications found.');
            console.log('Creating "Hume AI Agent" application...');

            const { data: newApp } = await telnyx.callControlApplications.create({
                application_name: 'Hume AI Agent',
                webhook_event_url: 'https://example.com/webhook', // Placeholder, will be overridden by dial()
                connection_name: 'Hume AI Connection',
                active: true,
                anchorsite_override: 'Latency'
            });

            console.log('✅ Created new Call Control App!');
            console.log(`ID: ${newApp.id}`);
            console.log(`Name: ${newApp.application_name}`);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

listApps();
