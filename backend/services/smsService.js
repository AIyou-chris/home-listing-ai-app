const axios = require('axios');

const TEXTBELT_MESSAGES_URL = 'https://textbelt.com/text';
const SMS_PROVIDER = 'textbelt';

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

const validatePhoneNumber = (phoneNumber) => {
  const destination = normalizePhoneNumber(phoneNumber);
  if (!destination) return false;
  const digits = destination.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
};

const getTextbeltReplyWebhookUrl = () => {
  return process.env.TEXTBELT_REPLY_WEBHOOK_URL || null;
};

const buildReplyWebhookUrl = () => {
  const base = getTextbeltReplyWebhookUrl();
  if (!base) return null;
  return base.endsWith('/api/webhooks/textbelt/inbound')
    ? base
    : `${base.replace(/\/$/, '')}/api/webhooks/textbelt/inbound`;
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

  const isValid = validatePhoneNumber(to);
  if (!isValid) {
    console.warn(`⚠️ [SMS] Invalid phone number format for ${destination}.`);
    return false;
  }

  const appendedMedia = Array.isArray(mediaUrls) && mediaUrls.length > 0
    ? `\n\n${mediaUrls.join('\n')}`
    : '';
  const messageText = `${message}${appendedMedia}`.trim();

  try {
    console.log(`📱 [SMS] Sending to ${destination} via ${getSmsProviderName()}...`);
    const result = await sendViaTextbelt({ destination, messageText });

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
