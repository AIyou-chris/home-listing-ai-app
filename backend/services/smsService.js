const axios = require('axios');

const API_URL = 'https://api.telnyx.com/v2/messages';
const LOOKUP_URL = 'https://api.telnyx.com/v2/number_lookups';

// SAFETY: In-memory rate limiter
// Map<normalizedPhone, timestamp>
const messageHistory = new Map();

const normalizePhoneNumber = (num) => {
    if (!num) return null;
    const digits = num.replace(/\D/g, '');
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    return num.startsWith('+') ? num : `+${digits}`;
};

const checkSafetyRules = (destination) => {
    const now = new Date();
    const hour = now.getHours(); // 0-23 (Server Time)

    // 1. SLEEP MODE (Safe Hours: 8 AM - 9 PM)
    // Prevents waking people up or violating TCPA night-time rules
    const START_HOUR = 8;
    const END_HOUR = 21;
    if (hour < START_HOUR || hour >= END_HOUR) {
        console.warn(`🌙 [Safety] Blocked SMS to ${destination}: Outside safe hours (${hour}:00).`);
        return { safe: false, reason: 'Outside safe hours (Sleep Mode)' };
    }

    // 2. FREQUENCY GUARD (Rate Limit)
    // Limit: Max 1 message every 10 seconds to the same number (Antispam)
    const lastSent = messageHistory.get(destination);
    if (lastSent) {
        const diffMs = now - lastSent;
        if (diffMs < 10000) { // 10 seconds buffer
            console.warn(`🛡️ [Safety] Blocked SMS to ${destination}: Sending too fast.`);
            return { safe: false, reason: 'Rate limit exceeded (Frequency Guard)' };
        }
    }

    // Update history
    messageHistory.set(destination, now);
    return { safe: true };
};

const validatePhoneNumber = async (phoneNumber) => {
    const apiKey = process.env.VITE_TELNYX_API_KEY;
    if (!apiKey) return true; // Skip validation if key missing (dev/local without creds)

    const destination = normalizePhoneNumber(phoneNumber);
    if (!destination) return false;

    try {
        console.log(`🔍 [Lookup] Verifying ${destination}...`);
        const url = `${LOOKUP_URL}/${encodeURIComponent(destination)}?type=carrier`;

        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const data = response.data?.data;
        if (!data) return false;

        if (!data.valid_number) {
            console.warn(`❌ [Lookup] Invalid Number Detected: ${destination}`);
            return false;
        }

        console.log(`✅ [Lookup] Number Validated. Type: ${data.carrier?.type || 'unknown'}`);
        return true;

    } catch (error) {
        // If 404/400, it's an invalid number request
        if (error.response && (error.response.status === 404 || error.response.status === 400)) {
            console.warn(`❌ [Lookup] Number Rejected by Telnyx: ${destination}`);
            return false;
        }
        console.error(`⚠️ [Lookup] API Error: ${error.message}. Allowing send.`);
        return true; // Fail open to avoid blocking reliable numbers during API outage
    }
};

const sendSms = async (to, message, mediaUrls = []) => {
    const apiKey = process.env.VITE_TELNYX_API_KEY;
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

    // STEP 1: SAFETY CHECKS (Free & Fast)
    const safety = checkSafetyRules(destination);
    if (!safety.safe) {
        console.warn(`🛑 [SMS] Aborted by Safety Shield: ${safety.reason}`);
        return false;
    }

    // STEP 2: LOOKUP (Small Cost)
    const isValid = await validatePhoneNumber(to);
    if (!isValid) {
        console.warn(`🛑 [SMS] Aborted sending to invalid number: ${destination}`);
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
        // Return full response so we can track Message ID
        return response.data;
    } catch (error) {
        console.error('❌ [SMS] Failed to send:', error.response ? error.response.data : error.message);
        return false;
    }
};

module.exports = {
    sendSms,
    validatePhoneNumber
};
