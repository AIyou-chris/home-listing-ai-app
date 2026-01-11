const crypto = require('crypto');

/**
 * Email Tracking Service
 * Injects tracking pixels and click tracking into email HTML
 */

class EmailTrackingService {
    constructor(baseUrl) {
        this.baseUrl = baseUrl || process.env.APP_URL || 'https://www.homelistingai.app';
    }

    /**
     * Generate a unique message ID
     */
    generateMessageId() {
        return `msg_${crypto.randomBytes(16).toString('hex')}`;
    }

    /**
     * Inject tracking pixel into HTML email
     */
    injectTrackingPixel(html, messageId) {
        if (!html || !messageId) return html;

        const trackingPixelUrl = `${this.baseUrl}/api/track/email/open/${messageId}`;
        const trackingPixel = `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;opacity:0;visibility:hidden;" alt="" />`;

        // Try to inject before closing </body> tag
        if (html.includes('</body>')) {
            return html.replace('</body>', `${trackingPixel}</body>`);
        }

        // If no </body>, append to end
        return html + trackingPixel;
    }

    /**
     * Wrap links with click tracking
     */
    wrapLinksWithTracking(html, messageId) {
        if (!html || !messageId) return html;

        // Match all <a href="..."> tags
        const linkRegex = /<a\s+([^>]*\s+)?href="([^"]+)"([^>]*)>/gi;

        return html.replace(linkRegex, (match, before, url, after) => {
            // Skip if already a tracking link
            if (url.includes('/api/track/email/click/')) {
                return match;
            }

            // Skip anchor links and javascript:
            if (url.startsWith('#') || url.startsWith('javascript:') || url.startsWith('mailto:')) {
                return match;
            }

            // Create tracked URL
            const trackedUrl = `${this.baseUrl}/api/track/email/click/${messageId}?url=${encodeURIComponent(url)}`;

            // Rebuild the anchor tag
            const beforeAttr = before || '';
            const afterAttr = after || '';
            return `<a ${beforeAttr}href="${trackedUrl}"${afterAttr}>`;
        });
    }

    /**
     * Inject all tracking into email HTML
     */
    injectTracking(html, messageId) {
        if (!html) return html;

        let trackedHtml = html;

        // Inject click tracking
        trackedHtml = this.wrapLinksWithTracking(trackedHtml, messageId);

        // Inject tracking pixel
        trackedHtml = this.injectTrackingPixel(trackedHtml, messageId);

        return trackedHtml;
    }

    /**
     * Create tracking record in database
     */
    async createTrackingRecord(supabaseAdmin, {
        messageId,
        userId,
        leadId,
        funnelType,
        stepId,
        subject,
        recipientEmail
    }) {
        try {
            const { data, error } = await supabaseAdmin
                .from('email_tracking_events')
                .insert({
                    message_id: messageId,
                    user_id: userId,
                    lead_id: leadId,
                    funnel_type: funnelType || null,
                    step_id: stepId || null,
                    subject: subject || '',
                    recipient_email: recipientEmail,
                    sent_at: new Date().toISOString(),
                    open_count: 0,
                    click_count: 0
                })
                .select()
                .single();

            if (error) {
                console.error('Error creating tracking record:', error);
                return null;
            }

            return data;
        } catch (err) {
            console.error('Exception creating tracking record:', err);
            return null;
        }
    }
}

module.exports = new EmailTrackingService();
