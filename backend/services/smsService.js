const axios = require('axios');

const API_URL = 'https://api.telnyx.com/v2/messages';
const LOOKUP_URL = 'https://api.telnyx.com/v2/number_lookups';
const SMS_COMING_SOON =
    String(process.env.SMS_COMING_SOON || 'true').toLowerCase() !== 'false';

// SAFETY: In-memory rate limiter
// Map<normalizedPhone, timestamp>
const messageHistory = new Map();

const normalizePhoneNumber = (num) => {
    if (!num) return null;
    const digits = num.replace(/\D/g, '');

    // Fix common typo: +11 (User typed 1 and country code)
    if (digits.length === 11 && digits.startsWith('11')) {
        return `+${digits.substring(1)}`; // +1206...
    }

    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;

    // International
    return num.startsWith('+') ? num : `+${digits}`;
};

const checkSafetyRules = (destination) => {
    const now = new Date();

    // 1. FREQUENCY GUARD (Rate Limit)
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

// (Deleted orphaned code)

// Updated signature to accept userId for billing
const sendSms = async (to, message, mediaUrls = [], userId = null) => {
    if (SMS_COMING_SOON) {
        console.log('📵 [SMS] Skipping send: SMS channel is marked as coming soon.');
        return false;
    }

    const apiKey = process.env.VITE_TELNYX_API_KEY;
    const fromNumber = process.env.VITE_TELNYX_PHONE_NUMBER;
    const { supabaseAdmin } = require('./supabase'); // Ensure we have DB access

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
        console.error(`❌ [SMS] Invalid destination phone number: ${destination}`);
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
        console.warn(`⚠️ [SMS] Lookup failed or rejected for ${destination}. Proceeding anyway (Trial Mode / Best Effort)...`);
        // return false; // DISABLED BLOCKING for now
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

        // BILLING: Increment Usage if userId is provided
        if (userId && supabaseAdmin) {
            try {
                // Determine cost (segments). 1 segment ~ 160 chars.
                const segments = Math.ceil(message.length / 160);

                // Fetch current
                const { data: agent } = await supabaseAdmin.from('agents').select('sms_sent_monthly').eq('id', userId).single();
                const current = agent?.sms_sent_monthly || 0;

                await supabaseAdmin.from('agents').update({ sms_sent_monthly: current + segments }).eq('id', userId);
                console.log(`💰 [Billing] Incremented SMS usage for ${userId} by ${segments} segments.`);
            } catch (billingErr) {
                console.warn('⚠️ [Billing] Failed to update SMS usage:', billingErr.message);
            }
        }

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
