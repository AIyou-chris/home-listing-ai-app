const cron = require('node-cron');
const { addMinutes } = require('date-fns');

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

    console.log('⏰ Scheduler Service Initialized (Job: 1h Reminders)');
};
