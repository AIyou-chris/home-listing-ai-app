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
            if (!supabaseAdmin) {
                console.warn('Scheduler skipped: supabaseAdmin not available');
                return;
            }
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
    // Sends the 7-day onboarding drip — one email per trial day (24h..168h)
    cron.schedule('0 * * * *', async () => {
        try {
            console.log('⏰ Scheduler: Running Trial Engagement Check...');
            const now = new Date();

            // Fetch agents active/trial (assuming filtering by time handles status implicitly or we add status check)
            // We look back up to 8 days to be safe, but target specific windows
            const eightDaysAgo = subHours(now, 192).toISOString();

            let supportsAgentMetadata = true;
            let { data: agents, error } = await supabaseAdmin
                .from('agents')
                .select('id, email, first_name, created_at, metadata')
                .gte('created_at', eightDaysAgo) // Optimization: only recent users
                .not('email', 'is', null);

            if (error && String(error.message || '').toLowerCase().includes('metadata')) {
                supportsAgentMetadata = false;
                ({ data: agents, error } = await supabaseAdmin
                    .from('agents')
                    .select('id, email, first_name, created_at')
                    .gte('created_at', eightDaysAgo)
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

                // 7-day onboarding drip: each day N fires once in its 24h window
                // (N*24h .. N*24h+3h gives a 3h buffer for cron timing). Dedupe via
                // metadata.trial_system.dayN. Day 7 lands on the final trial day.
                for (let d = 1; d <= 7; d++) {
                    const windowStart = d * 24;
                    if (hoursSinceJoin >= windowStart && hoursSinceJoin < windowStart + 3 && !trialData[`day${d}`]) {
                        dayToSend = d;
                        break;
                    }
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

    // 3. Partner Invite Follow-Up Reminders (Every Hour)
    // Sends a follow-up email to the invited agent; BCC goes to INVITE_COPY_EMAIL if set.
    cron.schedule('0 * * * *', async () => {
        try {
            if (!supabaseAdmin) return;
            const now = new Date().toISOString();
            const copyEmail = process.env.INVITE_COPY_EMAIL || null;

            const { data: dueInvites, error } = await supabaseAdmin
                .from('agent_invites')
                .select('id, token, invited_email, invited_name, last_viewed_at, view_count, lo_agent_id')
                .lte('follow_up_at', now)
                .is('claimed_at', null);

            if (error) { console.error('[Follow-Up Reminder] DB error:', error); return; }
            if (!dueInvites || dueInvites.length === 0) return;

            console.log(`⏰ [Follow-Up Reminder] ${dueInvites.length} invite(s) due`);

            for (const invite of dueInvites) {
                // Look up LO name (lo_agent_id stores auth id in agent_invites)
                const { data: lo } = await supabaseAdmin
                    .from('agents')
                    .select('first_name, last_name, company, email')
                    .eq('auth_user_id', invite.lo_agent_id)
                    .maybeSingle();

                const agentName = invite.invited_name ? invite.invited_name.split(' ')[0] : 'there';
                const loName = [lo?.first_name, lo?.last_name].filter(Boolean).join(' ') || 'Your Loan Officer';
                const loCompany = lo?.company || 'HomeListingAI';
                const appBase = process.env.APP_BASE_URL || 'https://homelistingai.com';
                const wowLink = `${appBase}/partner-invite/${invite.token}`;

                const bccList = [lo?.email, copyEmail].filter(Boolean);

                await emailService.sendEmail({
                    to: invite.invited_email,
                    bcc: bccList,
                    subject: `Following up — did you get a chance to see this?`,
                    html: `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
  <p style="margin:0 0 20px; font-size:16px; color:#0f172a">Hi ${agentName},</p>
  <p style="margin:0 0 16px; font-size:15px; color:#374151; line-height:1.6">I wanted to follow up on the listing demo I sent over a few days ago. I'd love to show you how I can help your buyers get pre-approved faster — right from the listing page.</p>
  <p style="margin:0 0 24px; font-size:15px; color:#374151; line-height:1.6">Take a look when you get a chance:</p>
  <a href="${wowLink}" style="display:inline-block; background:#2563eb; color:#fff; font-weight:700; font-size:14px; padding:14px 28px; border-radius:10px; text-decoration:none; margin-bottom:28px">
    View the Demo →
  </a>
  <p style="margin:0 0 4px; font-size:15px; color:#0f172a; font-weight:600">${loName}</p>
  <p style="margin:0 0 28px; font-size:14px; color:#6b7280">${loCompany}</p>
  <p style="margin:0; font-size:11px; color:#d1d5db">Sent via <a href="${appBase}" style="color:#d1d5db">HomeListingAI</a></p>
</div>`,
                    tags: { type: 'partner_followup_reminder', invite_id: invite.id }
                });

                // Clear reminder so it doesn't fire again
                await supabaseAdmin
                    .from('agent_invites')
                    .update({ follow_up_at: null })
                    .eq('id', invite.id);

                console.log(`✅ [Follow-Up Reminder] Sent to ${invite.invited_email} | bcc: ${bccList.join(', ')}`);
            }
        } catch (err) {
            console.error('[Follow-Up Reminder] Exception:', err);
        }
    });

    // 4. Weekly Value Email to Listing Agents (Monday 8:00 AM)
    // For every listing that received at least 1 chatbot lead in the past 7 days,
    // email the listing agent a summary — with a shout-out to the LO who powered it.
    cron.schedule('0 8 * * 1', async () => {
        try {
            if (!supabaseAdmin || !emailService) return;
            console.log('⏰ Scheduler: Running Weekly Value Email to Listing Agents...');

            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            const appBase = process.env.APP_BASE_URL || 'https://homelistingai.com';

            // Get all chatbot leads from the past 7 days that have a listing_id
            const { data: recentLeads, error: leadsErr } = await supabaseAdmin
                .from('pre_qual_submissions')
                .select('listing_id, lo_agent_id, name, email, phone, created_at')
                .gte('created_at', sevenDaysAgo)
                .not('listing_id', 'is', null);

            if (leadsErr || !recentLeads || recentLeads.length === 0) return;

            // Group leads by listing_id
            const byListing = {};
            recentLeads.forEach(l => {
                if (!byListing[l.listing_id]) byListing[l.listing_id] = { leads: [], lo_agent_id: l.lo_agent_id };
                byListing[l.listing_id].leads.push(l);
            });

            for (const [listingId, { leads, lo_agent_id }] of Object.entries(byListing)) {
                try {
                    // Get listing owner
                    const { data: property } = await supabaseAdmin
                        .from('properties')
                        .select('address, city, state, user_id')
                        .eq('id', listingId)
                        .maybeSingle();
                    if (!property?.user_id) continue;

                    const { data: listingAgentUser } = await supabaseAdmin
                        .from('agents')
                        .select('email, first_name, name')
                        .eq('auth_user_id', property.user_id)
                        .maybeSingle();
                    if (!listingAgentUser?.email) continue;

                    // Get LO name
                    const { data: lo } = await supabaseAdmin
                        .from('agents')
                        .select('first_name, last_name, company')
                        .or(`id.eq.${lo_agent_id},auth_user_id.eq.${lo_agent_id}`)
                        .limit(1)
                        .maybeSingle();

                    const agentFirstName = listingAgentUser.first_name || listingAgentUser.name || 'there';
                    const loName = [lo?.first_name, lo?.last_name].filter(Boolean).join(' ') || 'Your loan officer';
                    const fullAddress = [property.address, property.city, property.state].filter(Boolean).join(', ') || 'your listing';
                    const leadCount = leads.length;

                    await emailService.sendEmail({
                        to: listingAgentUser.email,
                        subject: `📊 Your listing got ${leadCount} new buyer lead${leadCount > 1 ? 's' : ''} this week`,
                        html: `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;">
  <p style="margin:0 0 20px;font-size:16px;color:#0f172a">Hi ${agentFirstName}! 👋</p>
  <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6">
    Your listing at <strong>${fullAddress}</strong> attracted <strong>${leadCount} buyer lead${leadCount > 1 ? 's' : ''}</strong> this week through <strong>${loName}'s</strong> AI financing bot.
  </p>
  <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:12px;padding:20px;margin:0 0 24px;text-align:center;">
    <div style="font-size:40px;font-weight:900;color:#7c3aed">${leadCount}</div>
    <div style="font-size:13px;color:#6b7280;margin-top:4px">Buyer Lead${leadCount > 1 ? 's' : ''} This Week</div>
  </div>
  <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6">
    These are real buyers who engaged with the property and shared their contact info — they're already in the pipeline with ${loName}.
  </p>
  <p style="margin:0 0 28px;font-size:14px;color:#374151;line-height:1.6">
    This is the value of a great loan officer on your team. <strong>${loName}</strong> is working hard for your listings 💪
  </p>
  <p style="margin:0;font-size:11px;color:#d1d5db">Sent via <a href="${appBase}" style="color:#d1d5db">HomeListingAI</a></p>
</div>`,
                        tags: { type: 'weekly_value_email', listing_id: listingId }
                    });

                    console.log(`✅ [Weekly Value Email] Sent to ${listingAgentUser.email} for listing ${listingId} (${leadCount} leads)`);
                } catch (innerErr) {
                    console.error(`[Weekly Value Email] Failed for listing ${listingId}:`, innerErr?.message);
                }
            }
        } catch (err) {
            console.error('[Weekly Value Email] Exception:', err);
        }
    });

    console.log('⏰ Scheduler Service Initialized (Job: 1h Reminders)');
};
