const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const RETELL_API_BASE = String(process.env.RETELL_API_BASE_URL || 'https://api.retellai.com').replace(/\/+$/, '');
const RETELL_API_KEY = process.env.RETELL_API_KEY || process.env.RETELL_SECRET_KEY || '';
const RETELL_DEFAULT_AGENT_ID =
    process.env.RETELL_DEFAULT_AGENT_ID ||
    process.env.RETELL_AGENT_ID ||
    process.env.VOICE_PHASE1_FOLLOWUP_CONFIG_ID ||
    process.env.HUME_CONFIG_ID ||
    '';
const RETELL_FROM_NUMBER = process.env.RETELL_FROM_NUMBER || process.env.TELNYX_PHONE_NUMBER || '';

const callContextMap = new Map();
const finalizedCalls = new Set();

const FINAL_WEBHOOK_EVENTS = new Set(['call_ended', 'call_analyzed', 'call_completed', 'call_hangup', 'call_finished']);

const pickFirst = (...values) => values.find((value) => value !== null && value !== undefined && value !== '') || null;
const normalizePhone = (value) => String(value || '').replace(/[^+\d]/g, '').trim();

const toScalar = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
    return null;
};

const resolveRetellAgentId = (context = {}) => pickFirst(
    toScalar(context.retellAgentId),
    toScalar(context.configId),
    toScalar(context.humeConfigId),
    RETELL_DEFAULT_AGENT_ID
);

const buildDynamicVariables = (prompt, context = {}) => {
    const vars = {};
    const leadName = pickFirst(toScalar(context.leadName), toScalar(context.name), toScalar(context.fullName));
    const leadPhone = pickFirst(toScalar(context.leadPhone), toScalar(context.phone), toScalar(context.to));
    const leadEmail = toScalar(context.email);

    if (leadName) vars.lead_name = leadName;
    if (leadPhone) vars.lead_phone = leadPhone;
    if (leadEmail) vars.lead_email = leadEmail;
    if (prompt && String(prompt).trim()) vars.call_script = String(prompt).trim();

    return Object.keys(vars).length ? vars : null;
};

const parseMetadata = (metadata) => {
    if (!metadata) return {};
    if (typeof metadata === 'string') {
        try {
            const parsed = JSON.parse(metadata);
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (_) {
            return {};
        }
    }
    if (typeof metadata === 'object') return metadata;
    return {};
};

const extractTranscriptFromSegments = (segments) => {
    if (!Array.isArray(segments) || segments.length === 0) return '';

    const lines = [];
    for (const segment of segments) {
        if (!segment || typeof segment !== 'object') continue;
        const speaker = pickFirst(
            toScalar(segment.role),
            toScalar(segment.speaker),
            toScalar(segment.participant),
            toScalar(segment.source)
        ) || 'speaker';
        const text = pickFirst(
            toScalar(segment.content),
            toScalar(segment.text),
            toScalar(segment.transcript),
            toScalar(segment.message)
        );
        if (!text) continue;
        lines.push(`${speaker}: ${text}`);
    }

    return lines.join('\n').trim();
};

const extractTranscript = (payload, call) => {
    const directTranscript = pickFirst(
        toScalar(call?.transcript),
        toScalar(payload?.transcript),
        toScalar(payload?.call_transcript)
    );
    if (directTranscript) return directTranscript;

    const transcriptWithTools = payload?.transcript_with_tool_calls;
    if (typeof transcriptWithTools === 'string' && transcriptWithTools.trim()) {
        return transcriptWithTools.trim();
    }

    const segmentTranscript = extractTranscriptFromSegments(
        call?.transcript_object || payload?.transcript_object || payload?.conversation || []
    );
    return segmentTranscript;
};

const resolveUserIdFromLead = async (leadId) => {
    if (!leadId) return null;
    try {
        const { data, error } = await supabase
            .from('leads')
            .select('user_id')
            .eq('id', leadId)
            .maybeSingle();

        if (error) {
            console.warn('[Retell] Could not resolve lead owner:', error.message);
            return null;
        }

        return data?.user_id || null;
    } catch (error) {
        console.warn('[Retell] Failed lead owner lookup:', error.message);
        return null;
    }
};

const saveConversationTranscript = async ({ conversationId, callId, eventType, transcript }) => {
    if (!conversationId || !transcript) return;

    const { error } = await supabase
        .from('messages')
        .insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: transcript,
            metadata: {
                provider: 'retell',
                call_id: callId,
                event_type: eventType,
                captured_at: new Date().toISOString()
            }
        });

    if (error) {
        console.warn('[Retell] Failed to save conversation transcript:', error.message);
    }
};

const saveAITranscript = async ({ userId, callId, eventType, transcript, metadata }) => {
    if (!userId || !transcript) return;

    const { error } = await supabase
        .from('ai_transcripts')
        .insert({
            user_id: userId,
            sidekick: 'voice_call',
            title: `Voice Call ${new Date().toLocaleDateString()}`,
            content: transcript,
            meta: {
                provider: 'retell',
                call_id: callId,
                event_type: eventType,
                ...(metadata || {})
            }
        });

    if (error) {
        console.warn('[Retell] Failed to save ai_transcripts row:', error.message);
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
        console.warn('[Retell] Failed to mark conversation completed:', error.message);
    }
};

const persistTranscriptForCall = async ({ callId, eventType, call, transcript }) => {
    if (!callId || !transcript || finalizedCalls.has(callId)) return;

    const callMetadata = parseMetadata(call?.metadata);
    const cachedContext = callContextMap.get(callId) || {};
    const mergedContext = {
        ...cachedContext,
        ...callMetadata
    };
    callContextMap.set(callId, mergedContext);

    const conversationId = pickFirst(
        toScalar(mergedContext.conversation_id),
        toScalar(mergedContext.conversationId)
    );

    let userId = pickFirst(
        toScalar(mergedContext.user_id),
        toScalar(mergedContext.userId)
    );

    const leadId = pickFirst(
        toScalar(mergedContext.lead_id),
        toScalar(mergedContext.leadId)
    );

    if (!userId && leadId) {
        userId = await resolveUserIdFromLead(leadId);
    }

    await Promise.all([
        saveConversationTranscript({ conversationId, callId, eventType, transcript }),
        saveAITranscript({
            userId,
            callId,
            eventType,
            transcript,
            metadata: {
                assistant_key: pickFirst(
                    toScalar(mergedContext.assistant_key),
                    toScalar(mergedContext.assistantKey),
                    toScalar(mergedContext.bot_type),
                    toScalar(mergedContext.botType)
                ),
                lead_id: leadId
            }
        }),
        markConversationCompleted(conversationId)
    ]);

    finalizedCalls.add(callId);
};

const processRetellWebhook = async (payload = {}) => {
    const eventType = String(payload.event || payload.event_type || payload.type || '').toLowerCase();
    const call = payload.call && typeof payload.call === 'object' ? payload.call : {};
    const callId = pickFirst(
        toScalar(call.call_id),
        toScalar(payload.call_id),
        toScalar(payload.callId)
    );

    if (!callId) {
        console.warn('[Retell] Webhook missing call_id');
        return;
    }

    const callMetadata = parseMetadata(call.metadata || payload.metadata);
    const cachedContext = callContextMap.get(callId) || {};
    callContextMap.set(callId, { ...cachedContext, ...callMetadata });

    const transcript = extractTranscript(payload, call);
    const isTerminalByStatus = String(call.call_status || call.status || '').toLowerCase().includes('ended');
    const shouldPersistTranscript = Boolean(transcript) && (FINAL_WEBHOOK_EVENTS.has(eventType) || isTerminalByStatus);

    if (shouldPersistTranscript) {
        await persistTranscriptForCall({ callId, eventType, call, transcript });
    }

    if (FINAL_WEBHOOK_EVENTS.has(eventType) || isTerminalByStatus) {
        setTimeout(() => {
            callContextMap.delete(callId);
            finalizedCalls.delete(callId);
        }, 10 * 60 * 1000);
    }
};

const handleRetellWebhook = async (req, res) => {
    res.status(200).json({ received: true });

    processRetellWebhook(req.body || {}).catch((error) => {
        console.error('[Retell] Webhook processing failed:', error.message);
    });
};

const initiateOutboundCall = async (to, prompt = '', context = {}, _req = null) => {
    if (!RETELL_API_KEY) {
        throw new Error('Missing RETELL_API_KEY');
    }

    const normalizedTo = normalizePhone(to);
    if (!normalizedTo) {
        throw new Error('Invalid destination phone number');
    }

    const fromNumber = normalizePhone(RETELL_FROM_NUMBER);
    if (!fromNumber) {
        throw new Error('Missing RETELL_FROM_NUMBER (or TELNYX_PHONE_NUMBER)');
    }

    const selectedAgentId = resolveRetellAgentId(context);
    if (!selectedAgentId) {
        throw new Error('Missing Retell agent ID. Set RETELL_DEFAULT_AGENT_ID or pass configId.');
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
                    provider: 'retell',
                    direction: 'outbound',
                    assistant_key: context.assistantKey || context.botType || null
                }
            })
            .select('id')
            .maybeSingle();

        if (!error && data?.id) {
            conversationId = data.id;
        } else if (error) {
            console.warn('[Retell] Failed to create conversation row:', error.message);
        }
    }

    const metadata = {
        provider: 'retell',
        assistant_key: pickFirst(toScalar(context.assistantKey), toScalar(context.botType)),
        bot_type: pickFirst(toScalar(context.botType), toScalar(context.assistantKey)),
        source: toScalar(context.source) || 'voice_api',
        user_id: toScalar(context.userId),
        lead_id: toScalar(context.leadId),
        conversation_id: toScalar(conversationId),
        call_script: prompt ? String(prompt).slice(0, 1200) : null
    };

    const compactMetadata = Object.fromEntries(
        Object.entries(metadata).filter(([, value]) => value !== null && value !== undefined && value !== '')
    );

    const payload = {
        from_number: fromNumber,
        to_number: normalizedTo,
        override_agent_id: selectedAgentId,
        metadata: compactMetadata
    };

    const dynamicVariables = buildDynamicVariables(prompt, { ...context, to: normalizedTo });
    if (dynamicVariables) {
        payload.retell_llm_dynamic_variables = dynamicVariables;
    }

    const response = await fetch(`${RETELL_API_BASE}/v2/create-phone-call`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${RETELL_API_KEY}`,
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

    if (!response.ok) {
        const message = parsed?.message || parsed?.error || rawText || `Retell API request failed (${response.status})`;
        throw new Error(message);
    }

    const callId = pickFirst(toScalar(parsed.call_id), toScalar(parsed.callId));
    if (callId) {
        callContextMap.set(callId, compactMetadata);
    }

    return {
        success: true,
        callId: callId || null,
        status: parsed?.call_status || parsed?.status || 'queued',
        provider: 'retell'
    };
};

module.exports = {
    initiateOutboundCall,
    handleRetellWebhook,
    processRetellWebhook
};
