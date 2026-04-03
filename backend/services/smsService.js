const axios = require('axios');

const TELNYX_MESSAGES_URL = 'https://api.telnyx.com/v2/messages';
const TELNYX_LOOKUP_URL = 'https://api.telnyx.com/v2/number_lookups';
const TEXTBELT_MESSAGES_URL = 'https://textbelt.com/text';

const SMS_PROVIDER = String(
  process.env.SMS_PROVIDER || (process.env.TEXTBELT_API_KEY ? 'textbelt' : 'telnyx')
).trim().toLowerCase();

const SMS_COMING_SOON =
  String(process.env.SMS_COMING_SOON || 'true').toLowerCase() !== 'false';

// SAFETY: In-memory rate limiter
// Map<normalizedPhone, timestamp>
const messageHistory = new Map();

const nowIso = () => new Date().toISOString();

const getSmsProviderName = () => (SMS_PROVIDER === 'textbelt' ? 'textbelt' : 'telnyx');

const normalizePhoneNumber = (num) => {
  if (!num) return null;
  const digits = String(num).replace(/\D/g, '');

  if (digits.length === 11 && digits.startsWith('11')) {
    return `+${digits.substring(1)}`;
  }

  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;

  return String(num).startsWith('+') ? String(num) : `+${digits}`;
};

const checkSafetyRules = (destination) => {
  const now = new Date();
  const lastSent = messageHistory.get(destination);
  if (lastSent) {
    const diffMs = now - lastSent;
    if (diffMs < 10000) {
      console.warn(`🛡️ [Safety] Blocked SMS to ${destination}: Sending too fast.`);
      return { safe: false, reason: 'Rate limit exceeded (Frequency Guard)' };
    }
  }

  messageHistory.set(destination, now);
  return { safe: true };
};

const validatePhoneNumber = async (phoneNumber) => {
  if (getSmsProviderName() !== 'telnyx') {
    return true;
  }

  const apiKey = process.env.TELNYX_API_KEY;
  if (!apiKey) return true;

  const destination = normalizePhoneNumber(phoneNumber);
  if (!destination) return false;

  try {
    console.log(`🔍 [Lookup] Verifying ${destination}...`);
    const url = `${TELNYX_LOOKUP_URL}/${encodeURIComponent(destination)}?type=carrier`;

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
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
    if (error.response && (error.response.status === 404 || error.response.status === 400)) {
      console.warn(`❌ [Lookup] Number Rejected by Telnyx: ${destination}`);
      return false;
    }
    console.error(`⚠️ [Lookup] API Error: ${error.message}. Allowing send.`);
    return true;
  }
};

const getTextbeltReplyWebhookUrl = () => {
  return (
    process.env.TEXTBELT_REPLY_WEBHOOK_URL ||
    process.env.APP_BASE_URL ||
    process.env.PUBLIC_URL ||
    process.env.FRONTEND_URL ||
    null
  );
};

const buildReplyWebhookUrl = () => {
  const base = getTextbeltReplyWebhookUrl();
  if (!base) return null;
  return base.endsWith('/api/webhooks/textbelt/inbound')
    ? base
    : `${base.replace(/\/$/, '')}/api/webhooks/textbelt/inbound`;
};

const sendViaTelnyx = async ({ destination, messageText }) => {
  const apiKey = process.env.TELNYX_API_KEY;
  const fromNumber = process.env.TELNYX_PHONE_NUMBER;

  if (!apiKey) {
    console.warn('⚠️ [SMS] Telnyx API Key not configured (TELNYX_API_KEY).');
    return false;
  }

  if (!fromNumber) {
    console.warn('⚠️ [SMS] Telnyx From Number not configured.');
    return false;
  }

  const response = await axios.post(
    TELNYX_MESSAGES_URL,
    {
      from: fromNumber,
      to: destination,
      text: messageText
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      }
    }
  );

  const data = response.data?.data || {};
  console.log('✅ [SMS] Sent successfully via Telnyx:', response.data);
  return {
    provider: 'telnyx',
    id: data.id || null,
    data: response.data
  };
};

const sendViaTextbelt = async ({ destination, messageText }) => {
  const apiKey = process.env.TEXTBELT_API_KEY;
  const sender = process.env.TEXTBELT_SENDER || 'HomeListingAI';
  const replyWebhookUrl = buildReplyWebhookUrl();

  if (!apiKey) {
    console.warn('⚠️ [SMS] Textbelt API Key not configured (TEXTBELT_API_KEY).');
    return false;
  }

  const payload = {
    phone: destination,
    message: messageText,
    key: apiKey,
    sender
  };

  if (replyWebhookUrl) {
    payload.replyWebhookUrl = replyWebhookUrl;
  }

  const response = await axios.post(TEXTBELT_MESSAGES_URL, payload, {
    headers: {
      'Content-Type': 'application/json'
    }
  });

  const data = response.data || {};
  if (!data.success) {
    console.error('❌ [SMS] Textbelt send failed:', data);
    return false;
  }

  console.log('✅ [SMS] Sent successfully via Textbelt:', data);
  return {
    provider: 'textbelt',
    id: data.textId || null,
    data
  };
};

const sendSms = async (to, message, mediaUrls = [], userId = null) => {
  if (SMS_COMING_SOON) {
    console.log('📵 [SMS] Skipping send: SMS channel is disabled by configuration.');
    return false;
  }

  const destination = normalizePhoneNumber(to);
  if (!destination) {
    console.error(`❌ [SMS] Invalid destination phone number: ${to}`);
    return false;
  }

  const safety = checkSafetyRules(destination);
  if (!safety.safe) {
    console.warn(`🛑 [SMS] Aborted by Safety Shield: ${safety.reason}`);
    return false;
  }

  const isValid = await validatePhoneNumber(to);
  if (!isValid) {
    console.warn(`⚠️ [SMS] Lookup failed or rejected for ${destination}. Proceeding anyway (Trial Mode / Best Effort)...`);
  }

  const appendedMedia = Array.isArray(mediaUrls) && mediaUrls.length > 0
    ? `\n\n${mediaUrls.join('\n')}`
    : '';
  const messageText = `${message}${appendedMedia}`.trim();

  try {
    console.log(`📱 [SMS] Sending to ${destination} via ${getSmsProviderName()}...`);
    const result = getSmsProviderName() === 'textbelt'
      ? await sendViaTextbelt({ destination, messageText })
      : await sendViaTelnyx({ destination, messageText });

    if (!result) {
      return false;
    }

    const { supabaseAdmin } = require('./supabase');
    if (userId && supabaseAdmin) {
      try {
        const segments = Math.ceil(messageText.length / 160);
        const { data: agent } = await supabaseAdmin
          .from('agents')
          .select('sms_sent_monthly')
          .eq('id', userId)
          .single();
        const current = agent?.sms_sent_monthly || 0;
        await supabaseAdmin
          .from('agents')
          .update({ sms_sent_monthly: current + segments })
          .eq('id', userId);
        console.log(`💰 [Billing] Incremented SMS usage for ${userId} by ${segments} segments.`);
      } catch (billingErr) {
        console.warn('⚠️ [Billing] Failed to update SMS usage:', billingErr.message);
      }
    }

    return result;
  } catch (error) {
    const providerError = error.response?.data || error.message;
    console.error(`❌ [SMS] Failed to send via ${getSmsProviderName()}:`, providerError);
    return false;
  }
};

module.exports = {
  getSmsProviderName,
  normalizePhoneNumber,
  sendSms,
  validatePhoneNumber
};
