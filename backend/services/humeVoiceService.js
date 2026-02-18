const { HumeClient } = require('hume');
const { WebSocketServer } = require('ws');
const { Telnyx } = require('telnyx');
const { createClient } = require('@supabase/supabase-js');

// Supabase Admin for logging transcripts
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Configuration
const HUME_API_KEY = process.env.HUME_API_KEY;
const HUME_SECRET_KEY = process.env.HUME_SECRET_KEY;
const HUME_CONFIG_ID = process.env.HUME_CONFIG_ID;
const TELNYX_API_KEY = process.env.TELNYX_API_KEY || process.env.VITE_TELNYX_API_KEY;
const TELNYX_FROM_NUMBER = process.env.TELNYX_PHONE_NUMBER || '+12069442374';
const TELNYX_CONNECTION_ID = process.env.TELNYX_CONNECTION_ID;
const TELNYX_OUTBOUND_PROFILE_ID = process.env.TELNYX_OUTBOUND_PROFILE_ID || '';

const HTTP_PUBLIC_BASE_URL =
    process.env.VOICE_PUBLIC_BASE_URL ||
    process.env.PUBLIC_URL ||
    process.env.API_BASE_URL ||
    process.env.VITE_API_BASE_URL ||
    '';

// Telnyx Client
const telnyx = new Telnyx({ apiKey: TELNYX_API_KEY });

// Hume Client
const hume = new HumeClient({
    apiKey: HUME_API_KEY,
    secretKey: HUME_SECRET_KEY,
});

// Map to store call context by call ID or normalized destination number
const callContextMap = new Map();

const normalizeBaseUrl = (value) => {
    if (!value) return '';
    return String(value).trim().replace(/\/+$/, '');
};

const normalizePhone = (value) => String(value || '').replace(/\D/g, '').slice(-10);

const xmlEscape = (value) =>
    String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/'/g, '&apos;');

const pickFirst = (...values) => {
    for (const value of values) {
        if (value !== undefined && value !== null && value !== '') return value;
    }
    return undefined;
};

const buildPublicHttpBase = (req) => {
    const configured = normalizeBaseUrl(HTTP_PUBLIC_BASE_URL);
    if (configured) return configured;

    const forwardedProtoRaw = req?.headers?.['x-forwarded-proto'];
    const forwardedProto = Array.isArray(forwardedProtoRaw)
        ? forwardedProtoRaw[0]
        : String(forwardedProtoRaw || '').split(',')[0].trim();

    const forwardedHostRaw = req?.headers?.['x-forwarded-host'];
    const forwardedHost = Array.isArray(forwardedHostRaw)
        ? forwardedHostRaw[0]
        : String(forwardedHostRaw || '').split(',')[0].trim();

    const host = forwardedHost || req?.headers?.host || `localhost:${process.env.PORT || 3002}`;
    const protocol = forwardedProto || (req?.secure ? 'https' : 'http');

    return `${protocol}://${host}`;
};

const buildPublicWsBase = (req) => {
    const httpBase = buildPublicHttpBase(req);
    if (!httpBase) return '';

    try {
        const parsed = new URL(httpBase);
        parsed.protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
        return parsed.toString().replace(/\/+$/, '');
    } catch (_) {
        return httpBase.startsWith('https://')
            ? httpBase.replace(/^https:\/\//, 'wss://')
            : httpBase.replace(/^http:\/\//, 'ws://');
    }
};

const extractTelnyxCallPayload = (req) => {
    const payload = req?.body?.data?.payload;
    if (payload) {
        return {
            callControlId: payload.call_control_id,
            callSid: payload.call_sid,
            to: payload.to,
            from: payload.from,
            direction: payload.direction,
        };
    }

    // TeXML webhooks are often form-encoded Twilio-compatible parameters.
    const body = req?.body || {};
    return {
        callControlId: pickFirst(body.call_control_id, body.CallControlId),
        callSid: pickFirst(body.call_sid, body.CallSid),
        to: pickFirst(body.to, body.To, body.Called),
        from: pickFirst(body.from, body.From, body.Caller),
        direction: pickFirst(body.direction, body.Direction),
    };
};

const resolveCallIdFromWsRequest = (req) => {
    try {
        const base = `http://${req?.headers?.host || 'localhost'}`;
        const url = new URL(req?.url || '', base);
        return pickFirst(
            url.searchParams.get('call_id'),
            url.searchParams.get('x-call-id')
        );
    } catch (_) {
        return undefined;
    }
};

const isMissingOutboundProfileError = (error) => {
    const msg = String(error?.message || '').toLowerCase();
    if (msg.includes('d38') || msg.includes('outbound voice profile')) return true;

    const rawErrors = error?.raw?.errors;
    if (Array.isArray(rawErrors)) {
        return rawErrors.some((entry) => {
            const code = String(entry?.code || '').toLowerCase();
            const detail = String(entry?.detail || '').toLowerCase();
            const title = String(entry?.title || '').toLowerCase();
            return code.includes('d38') || detail.includes('outbound voice profile') || title.includes('outbound voice profile');
        });
    }

    return false;
};

const ensureOutboundProfileAssigned = async () => {
    if (!TELNYX_OUTBOUND_PROFILE_ID || !TELNYX_CONNECTION_ID) return false;

    try {
        await telnyx.texmlApplications.update(TELNYX_CONNECTION_ID, {
            outbound: {
                outbound_voice_profile_id: TELNYX_OUTBOUND_PROFILE_ID,
            },
        });
        console.log(`✅ [Hume Voice] Reassigned outbound profile ${TELNYX_OUTBOUND_PROFILE_ID}`);
        return true;
    } catch (error) {
        console.error('❌ [Hume Voice] Failed to reassign outbound profile:', error.message);
        return false;
    }
};

const buildWebhookUrl = (req) => `${buildPublicHttpBase(req)}/api/voice/hume/connect`;

const buildStreamUrl = (req, callId) => {
    const wsBase = buildPublicWsBase(req);
    return `${wsBase}/api/voice/hume/stream?call_id=${encodeURIComponent(callId)}`;
};

/**
 * Initiates an outbound call via Telnyx.
 * @param {string} to - The destination phone number.
 * @param {string} prompt - The system prompt/instructions for this specific call.
 * @param {object} context - Additional context variables.
 * @param {import('express').Request | undefined} req - Optional request for host/proxy inference.
 */
const initiateOutboundCall = async (to, prompt, context = {}, req) => {
    try {
        if (!TELNYX_CONNECTION_ID) {
            throw new Error('Missing TELNYX_CONNECTION_ID for TeXML outbound calling.');
        }

        const webhookUrl = buildWebhookUrl(req);

        // Create a conversation record in Supabase
        let conversationId = null;
        if (context.leadId) {
            const { data, error } = await supabase
                .from('conversations')
                .insert({
                    lead_id: context.leadId,
                    status: 'active',
                    metadata: { type: 'voice_call', provider: 'hume', direction: 'outbound' },
                })
                .select()
                .single();

            if (data) conversationId = data.id;
            if (error) console.error('Error creating conversation:', error.message);
        }

        const cleanNumber = normalizePhone(to);
        callContextMap.set(cleanNumber, { prompt, ...context, conversationId });

        console.log(`☎️ [Hume Voice] Initiating outbound call to ${to}...`);
        console.log(`📝 [Hume Voice] Context loaded for ${cleanNumber}`);
        console.log(`🔗 [Hume Voice] TeXML URL override: ${webhookUrl}`);

        const payload = {
            To: to,
            From: TELNYX_FROM_NUMBER,
            Url: webhookUrl,
            UrlMethod: 'POST',
            FallbackUrl: webhookUrl,
            FallbackMethod: 'POST',
        };

        let call;
        try {
            call = await telnyx.texml.calls.initiate(TELNYX_CONNECTION_ID, payload);
        } catch (error) {
            if (isMissingOutboundProfileError(error)) {
                const reassigned = await ensureOutboundProfileAssigned();
                if (reassigned) {
                    call = await telnyx.texml.calls.initiate(TELNYX_CONNECTION_ID, payload);
                } else {
                    throw error;
                }
            } else {
                throw error;
            }
        }

        const callId = pickFirst(call?.call_sid, call?.data?.sid, call?.data?.call_sid);
        if (callId) {
            const currentContext = callContextMap.get(cleanNumber);
            if (currentContext) callContextMap.set(callId, currentContext);
        }

        console.log(`✅ [Hume Voice] Call initiated. SID: ${callId || 'unknown'}`);
        return { success: true, callId: callId || null };
    } catch (error) {
        console.error('❌ [Hume Voice] Failed to initiate call:', error.message);
        if (error.raw) console.error(JSON.stringify(error.raw, null, 2));
        throw error;
    }
};

/**
 * Handles incoming call webhook from Telnyx and returns TeXML.
 */
const handleIncomingCall = (req, res) => {
    try {
        const payload = extractTelnyxCallPayload(req);
        const callId = pickFirst(payload.callControlId, payload.callSid, `call-${Date.now()}`);
        const direction = payload.direction || 'outbound';
        const to = payload.to || '';

        const wsUrl = buildStreamUrl(req, callId);

        console.log(`📞 [Hume Voice] Incoming call ${callId}. Direction: ${direction}`);
        console.log(`📡 [Hume Voice] Generated WebSocket URL: ${wsUrl}`);

        if (direction === 'outbound' && to) {
            const cleanTo = normalizePhone(to);
            const context = callContextMap.get(cleanTo);

            if (context) {
                console.log(`🔗 [Hume Voice] Linking context from ${cleanTo} to Call ID ${callId}`);
                callContextMap.set(callId, context);
            }
        }

        const escapedWsUrl = xmlEscape(wsUrl);
        const escapedCallId = xmlEscape(callId);
        const texml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">Hello! Please hold for just a moment while I connect you.</Say>
    <Pause length="1"/>
    <Connect>
        <Stream url="${escapedWsUrl}">
            <Parameter name="call_id" value="${escapedCallId}" />
            <Parameter name="track" value="inbound_track" />
        </Stream>
    </Connect>
</Response>`;

        res.type('text/xml');
        res.send(texml);
    } catch (error) {
        console.error('❌ [Hume Voice] Failed to generate TeXML:', error.message);
        res.status(500).type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
    }
};

/**
 * Attaches the WebSocket server to the existing HTTP server.
 * Handles the bidirectional audio stream between Telnyx and Hume.
 */
const attachVoiceBridge = (server) => {
    const wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
        const base = `http://${request.headers.host || 'localhost'}`;
        const url = new URL(request.url, base);

        console.log(`🔄 [Hume Voice] Upgrade Request: ${url.pathname} (Params: ${url.search})`);

        if (url.pathname === '/api/voice/hume/stream' || url.pathname.startsWith('/api/voice/hume/stream/')) {
            wss.handleUpgrade(request, socket, head, (ws) => {
                console.log('✅ [Hume Voice] WebSocket Upgrade Successful');
                wss.emit('connection', ws, request);
            });
            return;
        }

        console.log(`⚠️ [Hume Voice] Ignoring unknown upgrade path: ${url.pathname}`);
        socket.destroy();
    });

    wss.on('connection', async (ws, req) => {
        console.log('🔌 [Hume Voice] Telnyx connected to Media Stream');

        let humeSocket = null;
        let streamId = null;
        let activeCallId = resolveCallIdFromWsRequest(req);

        try {
            const context = activeCallId ? callContextMap.get(activeCallId) : null;
            const sessionSettings = context?.prompt ? { systemPrompt: context.prompt } : undefined;

            humeSocket = await hume.empathicVoice.chat.connect({
                configId: HUME_CONFIG_ID,
                sessionSettings,
            });

            humeSocket.on('open', () => {
                console.log('🧠 [Hume Voice] Connected to Hume EVI');
            });

            humeSocket.on('message', async (message) => {
                if (message.type === 'audio_output') {
                    const payload = {
                        event: 'media',
                        media: {
                            payload: message.data,
                            track: 'outbound_track',
                        },
                        stream_id: streamId,
                    };
                    if (ws.readyState === 1) ws.send(JSON.stringify(payload));
                }

                if (message.type === 'user_message' || message.type === 'assistant_message') {
                    const role = message.type === 'user_message' ? 'user' : 'assistant';
                    const text = message.message?.content || '';
                    const contextForTranscript = activeCallId ? callContextMap.get(activeCallId) : null;

                    if (contextForTranscript && contextForTranscript.leadId) {
                        try {
                            console.log(`💬 [Hume Transcript] ${role}: ${text}`);

                            if (contextForTranscript.conversationId) {
                                await supabase
                                    .from('messages')
                                    .insert({
                                        conversation_id: contextForTranscript.conversationId,
                                        role,
                                        content: text,
                                        metadata: {
                                            call_id: activeCallId,
                                            timestamp: new Date().toISOString(),
                                        },
                                    });
                                console.log(`✅ Saved transcript to Conv ${contextForTranscript.conversationId}`);
                            } else {
                                console.warn('⚠️ No conversation ID found for transcript');
                            }
                        } catch (err) {
                            console.error('Error logging transcript:', err);
                        }
                    } else {
                        console.log(`💬 [Hume Transcript] (${activeCallId || 'Unknown'}) ${role}: ${text}`);
                    }
                }
            });

            humeSocket.on('error', (err) => {
                console.error('❌ [Hume Voice] Hume Error:', err);
            });

            humeSocket.on('close', () => {
                console.log('👋 [Hume Voice] Hume disconnected');
                if (ws.readyState === 1) ws.close();
            });
        } catch (err) {
            console.error('❌ [Hume Voice] Failed to connect to Hume:', err);
            ws.close();
            return;
        }

        ws.on('message', async (data) => {
            try {
                const msg = JSON.parse(data.toString());

                if (msg.event === 'connected') {
                    console.log('✅ [Hume Voice] Telnyx Stream Connected');
                } else if (msg.event === 'start') {
                    streamId = pickFirst(msg.stream_id, msg.start?.stream_id);

                    const customParams = msg.start?.custom_parameters || msg.start?.customParameters || {};
                    const startCallId = pickFirst(
                        msg.call_id,
                        msg.start?.call_id,
                        customParams.call_id,
                        customParams['x-call-id']
                    );

                    if (!activeCallId && startCallId) activeCallId = String(startCallId);
                    console.log(`🎬 [Hume Voice] Stream Started. ID: ${streamId || 'unknown'} Call: ${activeCallId || 'unknown'}`);
                } else if (msg.event === 'media') {
                    if (humeSocket && msg.media?.payload) {
                        await humeSocket.sendAudioInput({
                            data: msg.media.payload,
                        });
                    }
                } else if (msg.event === 'stop') {
                    console.log('🛑 [Hume Voice] Stream Stopped');
                    if (humeSocket) humeSocket.close();
                }
            } catch (error) {
                console.error('Error parsing Telnyx message:', error);
            }
        });

        ws.on('close', () => {
            console.log('🔌 [Hume Voice] Telnyx Disconnected');
            if (humeSocket) humeSocket.close();
        });
    });
};

module.exports = {
    handleIncomingCall,
    initiateOutboundCall,
    attachVoiceBridge,
};
