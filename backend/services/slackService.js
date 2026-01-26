const axios = require('axios');

/**
 * Send alert to Slack
 * Requires SLACK_WEBHOOK_URL env variable
 */
const sendAlert = async (message, channel = null) => {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return; // Silent if not configured

    try {
        const payload = { text: message };
        if (channel) payload.channel = channel;

        await axios.post(webhookUrl, payload);
    } catch (error) {
        console.error('Failed to send Slack alert:', error.message);
    }
};

module.exports = { sendAlert };
