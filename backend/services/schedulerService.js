const cron = require('node-cron');
const { addMinutes, subHours, differenceInHours } = require('date-fns');

/**
 * Scheduler Service
 * Handles periodic tasks like Appointment Reminders
 */
module.exports = (supabaseAdmin, emailService) => {

    // 1. Appointment Reminders (Every Minute)
    cron.schedule('* * * * *', async () => {
        try {
            if (!emailService) {
                console.warn('Scheduler skipped: emailService not available');
                return;
            }

            const now = new Date();
            // Look for appointments starting in exactly 60 minutes
            // We check a 1-minute window to avoid duplicates (assuming cron runs reliably once per minute)
            const startRange = addMinutes(now, 60);
            const endRange = addMinutes(now, 61);

            const { data: appointments, error } = await supabaseAdmin
                .from('appointments')
                .select('id, start_iso, user_id, email, name, meet_link')
                .gte('start_iso', startRange.toISOString())
                .lt('start_iso', endRange.toISOString())
                .eq('status', 'confirmed');

            if (error) {
                console.error('Scheduler DB Error:', error);
                return;
            }

            if (appointments && appointments.length > 0) {
                console.log(`⏰ Scheduler: Found ${appointments.length} appointments for 1-hour reminders.`);

                for (const appt of appointments) {
                    const { email, name, meet_link, start_iso } = appt;
                    if (!email) continue;

                    const timeString = new Date(start_iso).toLocaleTimeString();

                    await emailService.sendEmail({
                        to: email,
                        subject: `Reminder: Upcoming Appointment at ${timeString}`,
                        html: `
                    <div style="font-family: sans-serif; padding: 20px;">
                        <h2>Appointment Reminder</h2>
                        <p>Hi ${name || 'there'},</p>
                        <p>This is a friendly reminder about your upcoming appointment in <strong>1 hour</strong>.</p>
                        <p>When it's time, click the link below to join:</p>
                        <p>
                            <a href="${meet_link || '#'}" style="background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                                Join Meeting
                            </a>
                        </p>
                        <p style="margin-top: 20px; color: #666; font-size: 12px;">If you need to reschedule, please contact your agent.</p>
                    </div>
                `,
                        tags: { type: 'reminder', appointment_id: appt.id }
                    });
                    console.log(`✅ Reminder sent to ${email} (Appt: ${appt.id})`);
                }
            }
        } catch (err) {
            console.error('Scheduler Job Exception:', err);
        }
    });

    // 2. Trial Engagement System (Every Hour)
    // Checks for users who joined 24h, 48h, or 72h ago
    cron.schedule('0 * * * *', async () => {
        try {
            console.log('⏰ Scheduler: Running Trial Engagement Check...');
            const now = new Date();

            // Fetch agents active/trial (assuming filtering by time handles status implicitly or we add status check)
            // We look back up to 4 days to be safe, but target specific windows
            const fourDaysAgo = subHours(now, 96).toISOString();

            let supportsAgentMetadata = true;
            let { data: agents, error } = await supabaseAdmin
                .from('agents')
                .select('id, email, first_name, created_at, metadata')
                .gte('created_at', fourDaysAgo) // Optimization: only recent users
                .not('email', 'is', null);

            if (error && String(error.message || '').toLowerCase().includes('metadata')) {
                supportsAgentMetadata = false;
                ({ data: agents, error } = await supabaseAdmin
                    .from('agents')
                    .select('id, email, first_name, created_at')
                    .gte('created_at', fourDaysAgo)
                    .not('email', 'is', null));
            }

            if (error) {
                console.error('Scheduler DB Error (Trial System):', error);
                return;
            }

            if (!agents || agents.length === 0) return;

            const dashboardUrl = process.env.APP_BASE_URL || 'https://homelistingai.com';

            for (const agent of agents) {
                const joinedAt = new Date(agent.created_at);
                const hoursSinceJoin = differenceInHours(now, joinedAt);
                const metadata = supportsAgentMetadata ? (agent.metadata || {}) : {};
                const trialData = metadata.trial_system || {};
                let emailSent = false;
                let dayToSend = null;

                // Day 1: 24-26 hours after join (allowing 2h window for cron execution safety)
                if (hoursSinceJoin >= 24 && hoursSinceJoin < 27 && !trialData.day1) {
                    dayToSend = 1;
                }
                // Day 2: 48-51 hours
                else if (hoursSinceJoin >= 48 && hoursSinceJoin < 51 && !trialData.day2) {
                    dayToSend = 2;
                }
                // Day 3: 72-75 hours
                else if (hoursSinceJoin >= 72 && hoursSinceJoin < 75 && !trialData.day3) {
                    dayToSend = 3;
                }

                if (dayToSend) {
                    console.log(`📧 Sending Trial Day ${dayToSend} email to ${agent.email}`);
                    await emailService.sendTrialEngagementEmail({
                        to: agent.email,
                        firstName: agent.first_name || 'Agent',
                        day: dayToSend,
                        dashboardUrl
                    });

                    // Update metadata to prevent duplicate sending
                    const newMetadata = {
                        ...metadata,
                        trial_system: {
                            ...trialData,
                            [`day${dayToSend}`]: true,
                            last_sent: new Date().toISOString()
                        }
                    };

                    if (supportsAgentMetadata) {
                        await supabaseAdmin
                            .from('agents')
                            .update({ metadata: newMetadata })
                            .eq('id', agent.id);
                    }

                    emailSent = true;
                }
            }

        } catch (err) {
            console.error('Scheduler Job Exception (Trial System):', err);
        }
    });

    console.log('⏰ Scheduler Service Initialized (Job: 1h Reminders)');
};
