const { createClient } = require('@supabase/supabase-js');
const createEmailService = require('./emailService');
const { updateLeadIntelligence } = require('./leadIntelligenceService');
const { enqueueJob } = require('./jobQueueService');

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
let realtimePublisher = null;

const FINAL_MESSAGE_TYPES = new Set(['end-of-call-report']);
const FINAL_STATUSES = new Set(['ended']);
const APPOINTMENT_REMINDER_SOURCE = 'appointment_reminder';

const publishReminderOutcomeRealtime = async (payload = {}) => {
    if (typeof realtimePublisher !== 'function') return;
    try {
        await realtimePublisher(payload);
    } catch (error) {
        console.warn('[Vapi] Failed to publish reminder outcome realtime event:', error?.message || error);
    }
};

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

const normalizeAppointmentStatus = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return null;
    if (normalized === 'confirmed') return 'confirmed';
    if (normalized === 'rescheduled' || normalized === 'rescheduled_requested' || normalized === 'reschedule_requested') return 'reschedule_requested';
    if (normalized === 'cancelled' || normalized === 'canceled') return 'canceled';
    if (normalized === 'completed') return 'completed';
    if (normalized === 'scheduled') return 'scheduled';
    return normalized;
};

const normalizeOutcomeText = (value) => String(value || '').trim().toLowerCase();

const parseMaybeJson = (value) => {
    if (!value) return null;
    if (typeof value === 'object') return value;
    if (typeof value !== 'string') return null;
    try {
        return JSON.parse(value);
    } catch (_) {
        return null;
    }
};

const extractAgentIdFromAppointment = (appointment = {}) =>
    pickFirst(toScalar(appointment.agent_id), toScalar(appointment.user_id));

const extractReminderContext = (context = {}) => ({
    reminderId: pickFirst(toScalar(context.reminder_id), toScalar(context.reminderId)),
    appointmentId: pickFirst(toScalar(context.appointment_id), toScalar(context.appointmentId)),
    leadId: pickFirst(toScalar(context.lead_id), toScalar(context.leadId)),
    source: pickFirst(toScalar(context.source), toScalar(context.bot_type), toScalar(context.assistant_key))
});

const extractPressDigit = (message = {}, transcript = '') => {
    const candidates = [
        message.dtmf,
        message.call?.dtmf,
        message.call?.artifact?.dtmf,
        message.artifact?.dtmf,
        message.result?.dtmf,
        message.response?.dtmf,
        message.analysis?.dtmf
    ];

    for (const candidate of candidates) {
        const scalar = toScalar(candidate);
        if (!scalar) continue;
        const digit = scalar.trim();
        if (/^[129]$/.test(digit)) return digit;
    }

    const normalizedTranscript = normalizeOutcomeText(transcript);
    if (!normalizedTranscript) return null;

    const digitMatch = normalizedTranscript.match(/\b([129])\b/);
    if (digitMatch?.[1]) return digitMatch[1];

    if (/\bconfirm(ed|ation)?\b/.test(normalizedTranscript)) return '1';
    if (/\breschedul(e|ing|ed)|different time|another time\b/.test(normalizedTranscript)) return '2';
    if (/\bagent|human|representative|call me\b/.test(normalizedTranscript)) return '9';

    return null;
};

const deriveReminderOutcome = (message = {}, transcript = '') => {
    const endedReason = normalizeOutcomeText(
        pickFirst(
            toScalar(message.endedReason),
            toScalar(message.call?.endedReason),
            toScalar(message.call?.ended_reason),
            toScalar(message.reason)
        )
    );

    if (endedReason.includes('voicemail')) return { key: 'voicemail_left', eventType: 'VOICEMAIL_LEFT' };
    if (endedReason.includes('no-answer') || endedReason.includes('no answer') || endedReason.includes('busy')) {
        return { key: 'no_answer', eventType: 'NO_ANSWER' };
    }
    if (endedReason.includes('failed') || endedReason.includes('error')) {
        return { key: 'failed', eventType: 'REMINDER_FAILED' };
    }

    const digit = extractPressDigit(message, transcript);
    if (digit === '1') {
        return {
            key: 'confirmed',
            eventType: 'APPOINTMENT_CONFIRMED',
            nextStatus: 'confirmed',
            nextConfirmationStatus: 'confirmed'
        };
    }
    if (digit === '2') {
        return {
            key: 'reschedule_requested',
            eventType: 'APPOINTMENT_RESCHEDULE_REQUESTED',
            nextStatus: 'reschedule_requested',
            nextConfirmationStatus: 'unknown'
        };
    }
    if (digit === '9') return { key: 'handoff_requested', eventType: 'HUMAN_HANDOFF_REQUESTED' };

    const sentiment = normalizeOutcomeText(
        pickFirst(toScalar(message.analysis?.summary), toScalar(message.analysis?.result))
    );
    if (sentiment.includes('confirm')) {
        return {
            key: 'confirmed',
            eventType: 'APPOINTMENT_CONFIRMED',
            nextStatus: 'confirmed',
            nextConfirmationStatus: 'confirmed'
        };
    }

    return { key: 'no_answer', eventType: 'NO_ANSWER' };
};

const recordLeadEvent = async ({ leadId, type, payload }) => {
    if (!leadId || !type) return;
    try {
        await supabase.from('lead_events').insert({
            lead_id: leadId,
            type,
            payload: payload || {},
            created_at: new Date().toISOString()
        });
    } catch (error) {
        console.warn('[Vapi] Failed to record lead event:', error.message);
    }
};

const fetchAgentEmail = async (agentId) => {
    if (!agentId) return null;
    const { data, error } = await supabase
        .from('agents')
        .select('email')
        .eq('id', agentId)
        .maybeSingle();
    if (error) return null;
    return data?.email || null;
};

const sendAgentAppointmentUpdateEmail = async ({ agentId, appointment, lead, outcome, dashboardPath }) => {
    const to = await fetchAgentEmail(agentId);
    if (!to) return false;

    const listingAddress =
        appointment?.property_address ||
        appointment?.location ||
        'Listing';
    const appointmentTime = pickFirst(
        toScalar(appointment?.starts_at),
        toScalar(appointment?.start_iso)
    ) || 'unknown time';
    const leadContact = [
        lead?.full_name || lead?.name || 'Unknown lead',
        lead?.phone_e164 || lead?.phone || 'no phone',
        lead?.email_lower || lead?.email || 'no email'
    ].join(' | ');
    const dashboardBase = (process.env.DASHBOARD_BASE_URL || process.env.APP_BASE_URL || 'https://homelistingai.com').replace(/\/$/, '');

    const emailService = createEmailService();
    await emailService.sendEmail({
        to,
        subject: `Appointment update — ${listingAddress}`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.5;">
            <h3>Appointment update</h3>
            <p><strong>Update:</strong> ${outcome}</p>
            <p><strong>Lead:</strong> ${leadContact}</p>
            <p><strong>Time:</strong> ${appointmentTime}</p>
            <p><a href="${dashboardBase}${dashboardPath}">Open lead in dashboard</a></p>
          </div>
        `
    });

    return true;
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

const finalizeAppointmentReminderFromWebhook = async ({ callId, message, transcript }) => {
    const webhookContext = callContextFromObject(message.call || {});
    const cachedContext = callContextMap.get(callId) || {};
    const mergedContext = { ...cachedContext, ...webhookContext };
    const reminderContext = extractReminderContext(mergedContext);

    if (reminderContext.source !== APPOINTMENT_REMINDER_SOURCE && !reminderContext.reminderId) {
        return;
    }

    let reminder = null;
    if (reminderContext.reminderId) {
        const { data, error } = await supabase
            .from('appointment_reminders')
            .select('*')
            .eq('id', reminderContext.reminderId)
            .maybeSingle();
        if (error) {
            console.warn('[Vapi] Failed to load appointment reminder:', error.message);
            return;
        }
        reminder = data || null;
    }

    const appointmentId = pickFirst(
        reminder?.appointment_id,
        reminderContext.appointmentId
    );
    if (!appointmentId) return;

    const [{ data: appointment }, { data: lead }] = await Promise.all([
        supabase
            .from('appointments')
            .select('id, lead_id, agent_id, user_id, listing_id, starts_at, start_iso, status, confirmation_status, location, property_address, timezone')
            .eq('id', appointmentId)
            .maybeSingle(),
        (() => {
            const leadId = pickFirst(reminder?.payload?.lead_id, reminderContext.leadId, reminder?.lead_id);
            if (!leadId) return Promise.resolve({ data: null });
            return supabase
                .from('leads')
                .select('id, full_name, name, phone, phone_e164, email, email_lower')
                .eq('id', leadId)
                .maybeSingle();
        })()
    ]);

    const resolvedLeadId = pickFirst(
        appointment?.lead_id,
        lead?.id,
        reminder?.payload?.lead_id,
        reminderContext.leadId
    );
    const outcome = deriveReminderOutcome(message, transcript || '');
    const endedReason = pickFirst(
        toScalar(message.endedReason),
        toScalar(message.call?.endedReason),
        toScalar(message.reason)
    );

    if (reminder?.id) {
        const existingProviderResponse = parseMaybeJson(reminder.provider_response) || {};
        const reminderStatus =
            reminder.status === 'suppressed'
                ? 'suppressed'
                : outcome.key === 'failed'
                    ? 'failed'
                    : 'delivered';
        const providerResponse = {
            ...existingProviderResponse,
            call_id: callId,
            transcript: transcript || null,
            ended_reason: endedReason || null,
            outcome: outcome.key,
            updated_at: new Date().toISOString()
        };

        await supabase
            .from('appointment_reminders')
            .update({
                status: reminderStatus,
                provider_response: providerResponse,
                updated_at: new Date().toISOString()
            })
            .eq('id', reminder.id);
    }

    if (appointment?.id) {
        const nextStatus = normalizeAppointmentStatus(outcome.nextStatus);
        const nextConfirmationStatus = pickFirst(
            toScalar(outcome.nextConfirmationStatus),
            nextStatus === 'confirmed' ? 'confirmed' : null,
            nextStatus === 'reschedule_requested' ? 'unknown' : null
        );
        const appointmentPatch = {
            last_reminder_outcome: outcome.key,
            last_reminder_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        if (nextStatus) appointmentPatch.status = nextStatus;
        if (nextConfirmationStatus) appointmentPatch.confirmation_status = nextConfirmationStatus;

        const updateResult = await supabase
            .from('appointments')
            .update(appointmentPatch)
            .eq('id', appointment.id);
        if (updateResult.error && /column .* does not exist/i.test(updateResult.error.message || '')) {
            const legacyPatch = { ...appointmentPatch };
            delete legacyPatch.confirmation_status;
            delete legacyPatch.last_reminder_outcome;
            delete legacyPatch.last_reminder_at;
            await supabase
                .from('appointments')
                .update(legacyPatch)
                .eq('id', appointment.id);
        }
    }

    await recordLeadEvent({
        leadId: resolvedLeadId,
        type: outcome.eventType,
        payload: {
            appointment_id: appointmentId,
            reminder_id: reminder?.id || reminderContext.reminderId || null,
            call_id: callId,
            ended_reason: endedReason || null,
            outcome: outcome.key
        }
    });

    await recordLeadEvent({
        leadId: resolvedLeadId,
        type: 'REMINDER_OUTCOME',
        payload: {
            appointment_id: appointmentId,
            reminder_id: reminder?.id || reminderContext.reminderId || null,
            call_id: callId,
            ended_reason: endedReason || null,
            outcome: outcome.key
        }
    });

    if (resolvedLeadId) {
        updateLeadIntelligence({
            leadId: resolvedLeadId,
            trigger: 'reminder_outcome'
        }).catch((error) => {
            console.warn('[Vapi] Failed to refresh lead intelligence after reminder outcome:', error?.message || error);
        });
    }

    await publishReminderOutcomeRealtime({
        appointmentId,
        leadId: resolvedLeadId || null,
        agentId: extractAgentIdFromAppointment(appointment || {}),
        outcome: outcome.key,
        provider: 'vapi',
        occurredAt: new Date().toISOString(),
        notes: endedReason || null
    });

    if (['confirmed', 'reschedule_requested', 'handoff_requested', 'failed'].includes(outcome.key)) {
        const agentId = extractAgentIdFromAppointment(appointment || {});
        const dashboardPath = `/dashboard/leads/${resolvedLeadId || ''}`;
        const isReschedule = outcome.key === 'reschedule_requested';
        const idempotencyKey = isReschedule
            ? `email:appt_reschedule:${appointmentId}`
            : `email:appt_outcome:${appointmentId}:${outcome.key}`;
        const kind = isReschedule ? 'reschedule_requested_nudge' : 'appointment_update_agent';
        try {
            await enqueueJob({
                type: 'email_send',
                payload: {
                    kind,
                    agent_id: agentId || null,
                    lead_id: resolvedLeadId || null,
                    appointment_id: appointmentId,
                    outcome: outcome.key,
                    dashboard_path: '/dashboard/appointments',
                    lead_dashboard_path: dashboardPath,
                    listing_address: appointment?.property_address || appointment?.location || null,
                    appointment_starts_at: pickFirst(toScalar(appointment?.starts_at), toScalar(appointment?.start_iso)),
                    location: appointment?.location || null,
                    lead_name: lead?.full_name || lead?.name || null,
                    lead_phone: lead?.phone_e164 || lead?.phone || null,
                    lead_email: lead?.email_lower || lead?.email || null
                },
                idempotencyKey,
                priority: 3,
                runAt: new Date().toISOString(),
                maxAttempts: 3
            });
        } catch (error) {
            console.warn('[Vapi] Failed to enqueue appointment update email job:', error.message);
        }
    }
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
        const finalTranscript = extractTranscriptFromMessage(message) || (transcriptBufferMap.get(callId) || []).join('\n').trim();
        await persistTranscriptForCall({
            callId,
            eventType: messageType,
            message
        });
        await finalizeAppointmentReminderFromWebhook({
            callId,
            message,
            transcript: finalTranscript
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

const setRealtimePublisher = (publisher) => {
    realtimePublisher = typeof publisher === 'function' ? publisher : null;
};

const createCallPayload = ({ to, context, selectedAssistantId, conversationId }) => {
    const metadata = {
        provider: 'vapi',
        assistant_key: pickFirst(toScalar(context.assistantKey), toScalar(context.botType)),
        bot_type: pickFirst(toScalar(context.botType), toScalar(context.assistantKey)),
        source: toScalar(context.source) || 'voice_api',
        user_id: toScalar(context.userId),
        lead_id: toScalar(context.leadId),
        conversation_id: toScalar(conversationId),
        appointment_id: pickFirst(toScalar(context.appointmentId), toScalar(context.appointment_id)),
        reminder_id: pickFirst(toScalar(context.reminderId), toScalar(context.reminder_id)),
        listing_id: pickFirst(toScalar(context.listingId), toScalar(context.listing_id)),
        listing_address: pickFirst(toScalar(context.listingAddress), toScalar(context.listing_address)),
        appointment_starts_at: pickFirst(toScalar(context.appointmentStartsAt), toScalar(context.appointment_starts_at)),
        appointment_timezone: pickFirst(toScalar(context.appointmentTimezone), toScalar(context.appointment_timezone))
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
            conversation_id: toScalar(conversationId),
            appointment_id: pickFirst(toScalar(context.appointmentId), toScalar(context.appointment_id)),
            reminder_id: pickFirst(toScalar(context.reminderId), toScalar(context.reminder_id)),
            listing_id: pickFirst(toScalar(context.listingId), toScalar(context.listing_id)),
            listing_address: pickFirst(toScalar(context.listingAddress), toScalar(context.listing_address)),
            appointment_starts_at: pickFirst(toScalar(context.appointmentStartsAt), toScalar(context.appointment_starts_at)),
            appointment_timezone: pickFirst(toScalar(context.appointmentTimezone), toScalar(context.appointment_timezone))
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
    processVapiWebhook,
    setRealtimePublisher
};
