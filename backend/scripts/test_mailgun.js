require('dotenv').config({ path: '/Volumes/GFY/EatADick/Documents/GitHub/home-listing-ai-app/.env' });
const { buildIcsInvite } = require('/Volumes/GFY/EatADick/Documents/GitHub/home-listing-ai-app/backend/services/icsService');
const emailServiceBuilder = require('/Volumes/GFY/EatADick/Documents/GitHub/home-listing-ai-app/backend/services/emailService');

async function runTest() {
    try {
        const emailService = emailServiceBuilder(null); // No supabase needed for unit test of send

        // Let's create an ICS event
        const icsContent = buildIcsInvite({
            uid: `test-${Date.now()}@homelistingai.com`,
            title: 'Home Tour: 123 Main St',
            description: 'Looking forward to our tour.',
            location: '123 Main St',
            start: new Date(Date.now() + 86400000).toISOString(),
            end: new Date(Date.now() + 86400000 + 3600000).toISOString(),
            organizerName: 'Agent Alice',
            organizerEmail: 'alice@mg.homelistingai.com',
            attendeeEmail: 'test@example.com'
        });

        console.log('ICS string generated:\n', icsContent.substring(0, 100) + '...\n');

        const result = await emailService.sendEmail({
            to: process.env.VITE_ADMIN_EMAIL || 'test@example.com',
            subject: 'Test Mailgun Invite',
            html: `<h1>Hello World</h1><p>Test ICS generation</p>`,
            options: {
                ics: {
                    content: icsContent,
                    filename: 'invite.ics'
                }
            }
        });

        console.log('Result:', result);
    } catch (e) {
        console.error('Test Failed:', e);
    }
}
runTest();
