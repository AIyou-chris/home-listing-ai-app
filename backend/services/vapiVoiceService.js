const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const VAPI_API_BASE = String(process.env.VAPI_API_BASE_URL || 'https://api.vapi.ai').replace(/\/+$/, '');
const VAPI_API_KEY = process.env.VAPI_API_KEY || '';
const VAPI_DEFAULT_ASSISTANT_ID =
    process.env.VAPI_DEFAULT_ASSISTANT_ID ||
    process.env.VOICE_PHASE1_FOLLOWUP_CONFIG_ID ||
    process.env.HUME_CONFIG_ID ||
    '';
const VAPI_PHONE_NUMBER_ID = process.env.VAPI_PHONE_NUMBER_ID || '';
const VAPI_WEBHOOK_SECRET = process.env.VAPI_WEBHOOK_SECRET || '';

const callContextMap = new Map();
const transcriptBufferMap = new Map();
const finalizedCalls = new Set();

const FINAL_MESSAGE_TYPES = new Set(['end-of-call-report']);
const FINAL_STATUSES = new Set(['ended']);

const pickFirst = (...values) => values.find((value) => value !== null && value !== undefined && value !== '') || null;

const normalizePhone = (value) => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return '';

    if (trimmed.startsWith('+')) return trimmed;

    const digits = trimmed.replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    return `+${digits}`;
};

const toScalar = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
    return null;
};

const resolveAssistantId = (context = {}) => pickFirst(
    toScalar(context.vapiAssistantId),
    toScalar(context.configId),
    toScalar(context.humeConfigId),
    VAPI_DEFAULT_ASSISTANT_ID
);

const parseContextJson = (value) => {
    if (!value) return {};
    if (typeof value === 'object') return value;
    if (typeof value !== 'string') return {};

    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) {
        return {};
    }
};

const callContextFromObject = (call = {}) => {
    const context = {
        ...parseContextJson(call.metadata),
        ...parseContextJson(call.customData),
        ...parseContextJson(call.custom_data)
    };

    return context;
};

const extractCallId = (message = {}) => pickFirst(
    toScalar(message.call?.id),
    toScalar(message.call?.callId),
    toScalar(message.call?.call_id),
    toScalar(message.callId),
    toScalar(message.call_id)
);

const buildTranscriptFromArtifactMessages = (messages) => {
    if (!Array.isArray(messages)) return '';

    const lines = [];
    for (const item of messages) {
        if (!item || typeof item !== 'object') continue;
        const role = pickFirst(toScalar(item.role), toScalar(item.source)) || 'speaker';
        const text = pickFirst(toScalar(item.message), toScalar(item.content), toScalar(item.transcript));
        if (!text) continue;
        lines.push(`${role}: ${text}`);
    }

    return lines.join('\n').trim();
};

const extractTranscriptFromMessage = (message = {}) => {
    const direct = pickFirst(
        toScalar(message.transcript),
        toScalar(message.artifact?.transcript),
        toScalar(message.call?.artifact?.transcript)
    );
    if (direct) return direct;

    const artifactTranscript = buildTranscriptFromArtifactMessages(
        message.artifact?.messages || message.call?.artifact?.messages
    );
    if (artifactTranscript) return artifactTranscript;

    return '';
};

const resolveUserIdFromLead = async (leadId) => {
    if (!leadId) return null;
    try {
        const { data, error } = await supabase
            .from('leads')
            .select('user_id')
            .eq('id', leadId)
            .maybeSingle();

        if (error) return null;
        return data?.user_id || null;
    } catch (_) {
        return null;
    }
};

const saveConversationTranscript = async ({ conversationId, callId, transcript, eventType }) => {
    if (!conversationId || !transcript) return;

    const { error } = await supabase
        .from('messages')
        .insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: transcript,
            metadata: {
                provider: 'vapi',
                call_id: callId,
                event_type: eventType,
                captured_at: new Date().toISOString()
            }
        });

    if (error) {
        console.warn('[Vapi] Failed to save conversation transcript:', error.message);
    }
};

const saveAITranscript = async ({ userId, callId, transcript, eventType, metadata }) => {
    if (!userId || !transcript) return;

    const { error } = await supabase
        .from('ai_transcripts')
        .insert({
            user_id: userId,
            sidekick: 'voice_call',
            title: `Voice Call ${new Date().toLocaleDateString()}`,
            content: transcript,
            meta: {
                provider: 'vapi',
                call_id: callId,
                event_type: eventType,
                ...(metadata || {})
            }
        });

    if (error) {
        console.warn('[Vapi] Failed to save ai_transcripts row:', error.message);
    }
};

const markConversationCompleted = async (conversationId) => {
    if (!conversationId) return;

    const { error } = await supabase
        .from('conversations')
        .update({
            status: 'completed',
            updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);

    if (error) {
        console.warn('[Vapi] Failed to mark conversation completed:', error.message);
    }
};

const persistTranscriptForCall = async ({ callId, eventType, message, transcriptOverride }) => {
    if (!callId || finalizedCalls.has(callId)) return;

    const webhookContext = callContextFromObject(message.call || {});
    const cachedContext = callContextMap.get(callId) || {};
    const context = { ...cachedContext, ...webhookContext };
    callContextMap.set(callId, context);

    const bufferedLines = transcriptBufferMap.get(callId) || [];
    const bufferedTranscript = bufferedLines.join('\n').trim();

    const transcript = transcriptOverride || extractTranscriptFromMessage(message) || bufferedTranscript;
    if (!transcript) return;

    const conversationId = pickFirst(
        toScalar(context.conversation_id),
        toScalar(context.conversationId)
    );

    let userId = pickFirst(
        toScalar(context.user_id),
        toScalar(context.userId)
    );

    const leadId = pickFirst(
        toScalar(context.lead_id),
        toScalar(context.leadId)
    );

    if (!userId && leadId) {
        userId = await resolveUserIdFromLead(leadId);
    }

    await Promise.all([
        saveConversationTranscript({ conversationId, callId, transcript, eventType }),
        saveAITranscript({
            userId,
            callId,
            transcript,
            eventType,
            metadata: {
                assistant_key: pickFirst(
                    toScalar(context.assistant_key),
                    toScalar(context.assistantKey),
                    toScalar(context.bot_type),
                    toScalar(context.botType)
                ),
                lead_id: leadId
            }
        }),
        markConversationCompleted(conversationId)
    ]);

    finalizedCalls.add(callId);
    transcriptBufferMap.delete(callId);
};

const appendTranscriptLine = ({ callId, role, transcript }) => {
    if (!callId || !transcript) return;

    const lines = transcriptBufferMap.get(callId) || [];
    lines.push(`${role || 'speaker'}: ${transcript}`);
    transcriptBufferMap.set(callId, lines);
};

const verifyWebhookSecret = (req) => {
    if (!VAPI_WEBHOOK_SECRET) return true;

    const provided = req.headers['x-vapi-secret'];
    if (!provided) return false;
    return String(provided).trim() === String(VAPI_WEBHOOK_SECRET).trim();
};

const processVapiWebhook = async (payload = {}) => {
    const message = payload.message && typeof payload.message === 'object' ? payload.message : {};
    const messageTypeRaw = String(message.type || '').toLowerCase();
    const messageType = messageTypeRaw.startsWith('transcript') ? 'transcript' : messageTypeRaw;
    const callId = extractCallId(message);

    if (!callId) {
        console.warn('[Vapi] Webhook missing call id');
        return;
    }

    const webhookContext = callContextFromObject(message.call || {});
    if (Object.keys(webhookContext).length) {
        const cachedContext = callContextMap.get(callId) || {};
        callContextMap.set(callId, { ...cachedContext, ...webhookContext });
    }

    if (messageType === 'transcript') {
        const transcriptType = String(message.transcriptType || '').toLowerCase();
        const isFinal = transcriptType === 'final' || messageTypeRaw.includes('transcripttype="final"');
        if (isFinal && message.transcript) {
            appendTranscriptLine({
                callId,
                role: String(message.role || 'speaker').toLowerCase(),
                transcript: String(message.transcript)
            });
        }
    }

    const isTerminalStatus = messageType === 'status-update' && FINAL_STATUSES.has(String(message.status || '').toLowerCase());
    const isTerminalType = FINAL_MESSAGE_TYPES.has(messageType);

    if (isTerminalType || isTerminalStatus) {
        await persistTranscriptForCall({
            callId,
            eventType: messageType,
            message
        });

        setTimeout(() => {
            callContextMap.delete(callId);
            transcriptBufferMap.delete(callId);
            finalizedCalls.delete(callId);
        }, 10 * 60 * 1000);
    }
};

const handleVapiWebhook = async (req, res) => {
    if (!verifyWebhookSecret(req)) {
        return res.status(401).json({ error: 'Invalid Vapi webhook secret' });
    }

    res.status(200).json({ received: true });

    processVapiWebhook(req.body || {}).catch((error) => {
        console.error('[Vapi] Webhook processing failed:', error.message);
    });
};

const createCallPayload = ({ to, context, selectedAssistantId, conversationId }) => {
    const metadata = {
        provider: 'vapi',
        assistant_key: pickFirst(toScalar(context.assistantKey), toScalar(context.botType)),
        bot_type: pickFirst(toScalar(context.botType), toScalar(context.assistantKey)),
        source: toScalar(context.source) || 'voice_api',
        user_id: toScalar(context.userId),
        lead_id: toScalar(context.leadId),
        conversation_id: toScalar(conversationId)
    };

    const compactMetadata = Object.fromEntries(
        Object.entries(metadata).filter(([, value]) => value !== null && value !== undefined && value !== '')
    );

    const payload = {
        assistantId: selectedAssistantId,
        phoneNumberId: VAPI_PHONE_NUMBER_ID,
        customer: {
            number: to,
            numberE164CheckEnabled: false
        },
        name: pickFirst(
            toScalar(context.leadName),
            toScalar(context.name),
            toScalar(context.fullName),
            toScalar(context.assistantKey),
            'HomeListingAI Call'
        )
    };

    if (Object.keys(compactMetadata).length) {
        payload.metadata = compactMetadata;
    }

    return payload;
};

const tryCreateCall = async (payload) => {
    const endpoints = ['/call', '/call/phone'];
    let lastError = null;

    for (const endpoint of endpoints) {
        const response = await fetch(`${VAPI_API_BASE}${endpoint}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${VAPI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const rawText = await response.text();
        let parsed;
        try {
            parsed = rawText ? JSON.parse(rawText) : {};
        } catch (_) {
            parsed = { raw: rawText };
        }

        if (response.ok) {
            return parsed;
        }

        lastError = {
            status: response.status,
            message: parsed?.message || parsed?.error || rawText || `Vapi call request failed (${response.status})`,
            endpoint,
            payload,
            code: parsed?.code || null
        };

        if (response.status === 404) {
            continue;
        }

        if (response.status === 400 && payload.metadata) {
            const fallbackPayload = { ...payload };
            delete fallbackPayload.metadata;
            return tryCreateCall(fallbackPayload);
        }

        break;
    }

    if (!lastError) {
        throw new Error('Failed to create Vapi call');
    }

    throw new Error(`${lastError.message} [endpoint=${lastError.endpoint}]`);
};

const initiateOutboundCall = async (to, _prompt = '', context = {}, _req = null) => {
    if (!VAPI_API_KEY) {
        throw new Error('Missing VAPI_API_KEY');
    }

    if (!VAPI_PHONE_NUMBER_ID) {
        throw new Error('Missing VAPI_PHONE_NUMBER_ID');
    }

    const normalizedTo = normalizePhone(to);
    if (!normalizedTo) {
        throw new Error('Invalid destination phone number');
    }

    const selectedAssistantId = resolveAssistantId(context);
    if (!selectedAssistantId) {
        throw new Error('Missing Vapi assistant ID. Set VAPI_DEFAULT_ASSISTANT_ID or pass configId.');
    }

    let conversationId = null;
    if (context.leadId) {
        const { data, error } = await supabase
            .from('conversations')
            .insert({
                lead_id: context.leadId,
                status: 'active',
                metadata: {
                    type: 'voice_call',
                    provider: 'vapi',
                    direction: 'outbound',
                    assistant_key: context.assistantKey || context.botType || null
                }
            })
            .select('id')
            .maybeSingle();

        if (!error && data?.id) {
            conversationId = data.id;
        } else if (error) {
            console.warn('[Vapi] Failed to create conversation row:', error.message);
        }
    }

    const payload = createCallPayload({
        to: normalizedTo,
        context,
        selectedAssistantId,
        conversationId
    });

    const result = await tryCreateCall(payload);
    const callId = pickFirst(
        toScalar(result.id),
        toScalar(result.call?.id),
        toScalar(result.callId),
        toScalar(result.call_id)
    );

    if (callId) {
        callContextMap.set(callId, {
            provider: 'vapi',
            assistant_key: pickFirst(toScalar(context.assistantKey), toScalar(context.botType)),
            bot_type: pickFirst(toScalar(context.botType), toScalar(context.assistantKey)),
            source: toScalar(context.source) || 'voice_api',
            user_id: toScalar(context.userId),
            lead_id: toScalar(context.leadId),
            conversation_id: toScalar(conversationId)
        });
    }

    return {
        success: true,
        provider: 'vapi',
        callId: callId || null,
        status: result?.status || result?.state || 'queued',
        raw: {
            id: result?.id || null,
            cost: result?.cost || null,
            endedReason: result?.endedReason || null
        }
    };
};

module.exports = {
    initiateOutboundCall,
    handleVapiWebhook,
    processVapiWebhook
};
