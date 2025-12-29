const axios = require('axios');

const API_URL = 'https://api.telnyx.com/v2/messages';

const normalizePhoneNumber = (num) => {
    if (!num) return null;
    const digits = num.replace(/\D/g, '');
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    return num.startsWith('+') ? num : `+${digits}`;
};

const sendSms = async (to, message, mediaUrls = []) => {
    const apiKey = process.env.VITE_TELNYX_API_KEY; // Using VITE_ prefix as it's shared in .env
    const fromNumber = process.env.VITE_TELNYX_PHONE_NUMBER;

    if (!apiKey) {
        console.warn('⚠️ [SMS] Telnyx API Key not configured (VITE_TELNYX_API_KEY).');
        return false;
    }

    if (!fromNumber) {
        console.warn('⚠️ [SMS] Telnyx From Number not configured.');
        return false;
    }

    const destination = normalizePhoneNumber(to);
    if (!destination) {
        console.error(`❌ [SMS] Invalid destination phone number: ${to}`);
        return false;
    }

    try {
        console.log(`📱 [SMS] Sending to ${destination}...`);

        const payload = {
            from: fromNumber,
            to: destination,
            text: message
        };

        if (mediaUrls && Array.isArray(mediaUrls) && mediaUrls.length > 0) {
            payload.media_urls = mediaUrls;
            console.log(`📎 [SMS] Attaching media:`, mediaUrls);
        }

        const response = await axios.post(
            API_URL,
            payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                }
            }
        );

        console.log('✅ [SMS] Sent successfully:', response.data);
        return true;
    } catch (error) {
        console.error('❌ [SMS] Failed to send:', error.response ? error.response.data : error.message);
        return false;
    }
};

module.exports = {
    sendSms
};
