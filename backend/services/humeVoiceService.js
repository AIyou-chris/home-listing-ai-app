const { HumeClient } = require('hume');
const { WebSocketServer } = require('ws');
const { Telnyx } = require('telnyx');
const { createClient } = require('@supabase/supabase-js');

// ─── Audio Conversion Helpers ───────────────────────────────────────────────
// Hume EVI outputs WAV/PCM audio chunks (base64 encoded).
// Telnyx bidirectional RTP (PCMU) expects base64 raw RTP payload bytes.

const BIAS = 0x84;
const CLIP = 32635;

function linear16ToMulaw(sample) {
    let sign = (sample >> 8) & 0x80;
    if (sign !== 0) sample = -sample;
    if (sample > CLIP) sample = CLIP;
    sample += BIAS;
    let exponent = 7;
    let mask = 0x4000;
    for (; exponent > 0; exponent--, mask >>= 1) {
        if (sample & mask) break;
    }
    const mantissa = (sample >> (exponent + 3)) & 0x0F;
    return ~(sign | (exponent << 4) | mantissa) & 0xFF;
}

function downsamplePcm16(inputBuf, srcRate, dstRate) {
    if (srcRate === dstRate) return inputBuf;
    const ratio = srcRate / dstRate;
    const srcSamples = inputBuf.length / 2;
    const dstSamples = Math.floor(srcSamples / ratio);
    const output = Buffer.alloc(dstSamples * 2);
    for (let i = 0; i < dstSamples; i++) {
        const srcIndex = Math.min(Math.floor(i * ratio), srcSamples - 1);
        output.writeInt16LE(inputBuf.readInt16LE(srcIndex * 2), i * 2);
    }
    return output;
}

function pcm16BufToMulawBuf(pcmBuf) {
    const numSamples = pcmBuf.length / 2;
    const muBuf = Buffer.alloc(numSamples);
    for (let i = 0; i < numSamples; i++) {
        muBuf[i] = linear16ToMulaw(pcmBuf.readInt16LE(i * 2));
    }
    return muBuf;
}

function stripWavHeader(buf) {
    for (let i = 0; i < buf.length - 8; i++) {
        if (buf[i] === 0x64 && buf[i + 1] === 0x61 && buf[i + 2] === 0x74 && buf[i + 3] === 0x61) {
            return buf.slice(i + 8);
        }
    }
    return buf;
}

function parseWavMeta(buf) {
    if (buf.length < 44) return null;
    if (buf.toString('ascii', 0, 4) !== 'RIFF') return null;
    if (buf.toString('ascii', 8, 12) !== 'WAVE') return null;

    let dataOffset = -1;
    let dataLength = 0;
    let offset = 12;
    while (offset + 8 <= buf.length) {
        const chunkId = buf.toString('ascii', offset, offset + 4);
        const chunkSize = buf.readUInt32LE(offset + 4);
        const chunkDataStart = offset + 8;
        if (chunkId === 'data') {
            dataOffset = chunkDataStart;
            dataLength = Math.min(chunkSize, buf.length - chunkDataStart);
            break;
        }
        offset = chunkDataStart + chunkSize + (chunkSize % 2);
    }

    if (dataOffset < 0) return null;
    const channels = buf.readUInt16LE(22);
    const sampleRate = buf.readUInt32LE(24);
    const bitsPerSample = buf.readUInt16LE(34);

    return { dataOffset, dataLength, channels, sampleRate, bitsPerSample };
}

function extractMonoPcm16(buf, channels) {
    if (channels <= 1) return buf;
    const frameSize = channels * 2;
    const sampleCount = Math.floor(buf.length / frameSize);
    const mono = Buffer.alloc(sampleCount * 2);
    for (let i = 0; i < sampleCount; i++) {
        const sample = buf.readInt16LE(i * frameSize);
        mono.writeInt16LE(sample, i * 2);
    }
    return mono;
}

function humeAudioToTelnyxMulaw(base64Audio) {
    try {
        const audioBuf = Buffer.from(base64Audio, 'base64');
        if (!audioBuf.length) return null;

        const wavMeta = parseWavMeta(audioBuf);
        if (!wavMeta) {
            // If no WAV header is present, assume payload is already PCMU RTP payload.
            return audioBuf;
        }

        const pcmData = audioBuf.slice(wavMeta.dataOffset, wavMeta.dataOffset + wavMeta.dataLength);
        if (wavMeta.bitsPerSample !== 16) {
            console.warn(`⚠️ [Voice] Unsupported WAV bit depth: ${wavMeta.bitsPerSample}`);
            return null;
        }

        const monoPcm = extractMonoPcm16(pcmData, wavMeta.channels);
        const downsampled = downsamplePcm16(monoPcm, wavMeta.sampleRate || 24000, 8000);
        return pcm16BufToMulawBuf(downsampled);
    } catch (err) {
        console.error('Audio conversion error:', err.message);
        return null;
    }
}

// ─── Setup ──────────────────────────────────────────────────────────────────
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const HUME_API_KEY = process.env.HUME_API_KEY;
const HUME_SECRET_KEY = process.env.HUME_SECRET_KEY;
const HUME_CONFIG_ID = process.env.HUME_CONFIG_ID;
const TELNYX_API_KEY = process.env.TELNYX_API_KEY || process.env.VITE_TELNYX_API_KEY;
const TELNYX_FROM_NUMBER = process.env.TELNYX_PHONE_NUMBER || '+12069442374';
const TELNYX_CONNECTION_ID = process.env.TELNYX_CONNECTION_ID;

const HTTP_PUBLIC_BASE_URL =
    process.env.VOICE_PUBLIC_BASE_URL ||
    process.env.PUBLIC_URL ||
    process.env.API_BASE_URL ||
    process.env.VITE_API_BASE_URL ||
    '';

const telnyx = new Telnyx({ apiKey: TELNYX_API_KEY });
const hume = new HumeClient({ apiKey: HUME_API_KEY, secretKey: HUME_SECRET_KEY });
const VOICE_BRIDGE_STRICT_MODE = String(process.env.VOICE_BRIDGE_STRICT_MODE || 'true').toLowerCase() !== 'false';
const HUME_INBOUND_QUEUE_MAX = Math.max(Number(process.env.HUME_INBOUND_QUEUE_MAX || 120), 20);
const TELNYX_OUTBOUND_FRAME_MS = Math.max(Number(process.env.TELNYX_OUTBOUND_FRAME_MS || 20), 20);
const TELNYX_PCMU_FRAME_BYTES = 160; // 20ms @ 8kHz PCMU
const TELNYX_OUTBOUND_QUEUE_MAX_BYTES = Math.max(Number(process.env.TELNYX_OUTBOUND_QUEUE_MAX_BYTES || 160000), 1600);
const DEFAULT_SYSTEM_PROMPT = process.env.VOICE_DEFAULT_SYSTEM_PROMPT
    || 'You are a helpful, professional, and empathetic AI real estate voice assistant.';

// Context map: call_control_id -> { prompt, leadId, conversationId, ... }
const callContextMap = new Map();

// ─── Utils ──────────────────────────────────────────────────────────────────
const normalizeBaseUrl = (v) => String(v || '').trim().replace(/\/+$/, '');
const normalizePhone = (v) => String(v || '').replace(/\D/g, '').slice(-10);
const xmlEscape = (v) => String(v || '')
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
const pickFirst = (...args) => args.find(v => v !== null && v !== undefined && v !== '') ?? null;
const composeSystemPrompt = (ctx = {}) => {
    const userScript = pickFirst(
        ctx.prompt,
        ctx.systemPrompt,
        ctx.voicePrompt,
        ctx.funnelScript,
        ctx.script
    );
    const botTag = ctx.botType ? `Bot type: ${ctx.botType}.` : '';

    return [DEFAULT_SYSTEM_PROMPT, botTag, userScript]
        .filter(Boolean)
        .join('\n\n')
        .trim();
};

const buildPublicHttpBase = (req) => {
    const base = normalizeBaseUrl(HTTP_PUBLIC_BASE_URL);
    if (base) return base;
    if (req) {
        const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        if (host) return `${proto}://${host}`;
    }
    return 'http://localhost:3002';
};

const buildPublicWsBase = (req) => buildPublicHttpBase(req).replace(/^http/, 'ws');

const buildStreamUrl = (req, callId) => {
    const wsBase = buildPublicWsBase(req);
    return `${wsBase}/api/voice/hume/stream?call_id=${encodeURIComponent(callId)}`;
};

// ─── Outbound Call Initiation (Telnyx Call Control API) ──────────────────────
/**
 * Initiates an outbound call using Telnyx Call Control API (NOT TeXML).
 * Telnyx will call our webhook on call.answered with the call_control_id.
 * We then start media streaming from the webhook handler.
 */
const initiateOutboundCall = async (to, prompt, context = {}, req) => {
    try {
        if (!TELNYX_CONNECTION_ID) {
            throw new Error('Missing TELNYX_CONNECTION_ID');
        }

        const webhookUrl = `${buildPublicHttpBase(req)}/api/voice/telnyx/events`;

        // Create conversation record
        let conversationId = null;
        if (context.leadId) {
            const { data, error } = await supabase
                .from('conversations')
                .insert({
                    lead_id: context.leadId,
                    status: 'active',
                    metadata: { type: 'voice_call', provider: 'hume', direction: 'outbound' },
                })
                .select().single();
            if (data) conversationId = data.id;
            if (error) console.error('Error creating conversation:', error.message);
        }

        // Pre-store context by phone number (linked to call_control_id when call.answered fires)
        const cleanNumber = normalizePhone(to);
        callContextMap.set(cleanNumber, { prompt: prompt || '', ...context, conversationId });

        console.log(`☎️  [Voice] Initiating outbound call to ${to}`);
        console.log(`🔗 [Voice] Webhook: ${webhookUrl}`);

        // Use Telnyx Call Control API (NOT TeXML)
        const { data: call } = await telnyx.calls.dial({
            connection_id: TELNYX_CONNECTION_ID,
            to,
            from: TELNYX_FROM_NUMBER,
            webhook_url: webhookUrl,
            webhook_url_method: 'POST',
        });

        const callControlId = call?.call_control_id;
        if (callControlId) {
            const ctx = callContextMap.get(cleanNumber);
            if (ctx) callContextMap.set(callControlId, ctx);
            console.log(`✅ [Voice] Call created. call_control_id: ${callControlId}`);
        }

        return { success: true, callId: callControlId || null };
    } catch (error) {
        console.error('❌ [Voice] Failed to initiate call:', error.message);
        if (error.raw) console.error(JSON.stringify(error.raw, null, 2));
        throw error;
    }
};

// ─── Telnyx Call Control Event Handler ───────────────────────────────────────
/**
 * Handles Telnyx Call Control webhook events.
 * On call.answered → start media streaming via wss connection.
 */
const handleTelnyxEvent = async (req, res) => {
    // Acknowledge immediately
    res.status(200).json({ received: true });

    try {
        const event = req.body?.data;
        if (!event) return;

        const eventType = event.event_type;
        const payload = event.payload || {};
        const callControlId = payload.call_control_id;

        console.log(`📡 [Voice] Telnyx event: ${eventType} | call_control_id: ${callControlId}`);

        if (eventType === 'call.answered') {
            // Link context from phone number to call_control_id
            const toNumber = normalizePhone(payload.to);
            const ctx = callContextMap.get(toNumber) || callContextMap.get(callControlId);
            if (ctx && !callContextMap.has(callControlId)) {
                callContextMap.set(callControlId, ctx);
            }

            // Start media streaming via Telnyx Call Control API
            const streamUrl = `${buildPublicWsBase(req)}/api/voice/hume/stream?call_id=${encodeURIComponent(callControlId)}`;
            console.log(`🎙️  [Voice] call.answered — starting media stream to: ${streamUrl}`);

            try {
                await telnyx.calls.actions.startStreaming(callControlId, {
                    stream_url: streamUrl,
                    stream_track: 'both_tracks',
                    stream_bidirectional_mode: 'rtp',
                    stream_bidirectional_codec: 'PCMU',
                    stream_bidirectional_sampling_rate: 8000,
                });
                console.log('✅ [Voice] Media streaming started (bidirectional RTP mode)');
            } catch (streamErr) {
                console.error('❌ [Voice] Failed to start streaming:', streamErr.message);
                if (streamErr.raw) console.error(JSON.stringify(streamErr.raw, null, 2));
            }
        }

        if (eventType === 'call.hangup') {
            console.log(`📴 [Voice] Call hung up: ${callControlId}`);
            callContextMap.delete(callControlId);
        }

    } catch (err) {
        console.error('❌ [Voice] Error handling Telnyx event:', err.message);
    }
};

// ─── WebSocket Bridge (Telnyx ↔ Hume) ────────────────────────────────────────
const attachVoiceBridge = (server) => {
    const wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
        try {
            const base = `http://${request.headers.host || 'localhost'}`;
            const url = new URL(request.url, base);

            console.log(`🔄 [Voice] WS Upgrade: ${url.pathname}${url.search}`);

            if (url.pathname === '/api/voice/hume/stream') {
                wss.handleUpgrade(request, socket, head, (ws) => {
                    console.log('✅ [Voice] WebSocket upgraded successfully');
                    wss.emit('connection', ws, request);
                });
            } else {
                socket.destroy();
            }
        } catch (e) {
            console.error('❌ [Voice] WS upgrade error:', e.message);
            socket.destroy();
        }
    });

    wss.on('connection', async (ws, req) => {
        const base = `http://${req.headers.host || 'localhost'}`;
        const url = new URL(req.url, base);
        let activeCallId = url.searchParams.get('call_id') || null;
        let humeSocket = null;
        let humeReady = false;
        let humeConnecting = false;
        let streamSid = null;
        let bridgeClosed = false;
        let audioChunksSent = 0;
        let inboundFrames = 0;
        let outboundFrames = 0;
        let droppedFrames = 0;
        let queueDropLogs = 0;
        let forwardErrLogs = 0;
        let startedAt = Date.now();
        const inboundQueue = [];
        let outboundQueue = Buffer.alloc(0);
        let outboundTick = null;
        const bridgeLabel = () => `[Voice][${activeCallId || 'unknown-call'}]`;

        const logBridgeState = (stage, extra = '') => {
            console.log(`${bridgeLabel()} stage=${stage} strict=${VOICE_BRIDGE_STRICT_MODE} queue=${inboundQueue.length} in=${inboundFrames} out=${outboundFrames} drop=${droppedFrames}${extra ? ` ${extra}` : ''}`);
        };

        const enqueueInboundAudio = (payload) => {
            if (!VOICE_BRIDGE_STRICT_MODE) {
                droppedFrames += 1;
                return;
            }
            inboundQueue.push(payload);
            if (inboundQueue.length > HUME_INBOUND_QUEUE_MAX) {
                inboundQueue.shift();
                droppedFrames += 1;
                if (queueDropLogs < 3) {
                    console.warn(`${bridgeLabel()} queue_overflow drop=1 max=${HUME_INBOUND_QUEUE_MAX}`);
                    queueDropLogs += 1;
                }
            }
        };

        const flushInboundQueue = async () => {
            if (!humeSocket || !humeReady || inboundQueue.length === 0) return;
            while (inboundQueue.length && humeSocket && humeReady && ws.readyState === 1) {
                const nextPayload = inboundQueue.shift();
                try {
                    await humeSocket.sendAudioInput({ data: nextPayload });
                    inboundFrames += 1;
                } catch (err) {
                    enqueueInboundAudio(nextPayload);
                    if (forwardErrLogs < 5) {
                        console.error(`${bridgeLabel()} flush_failed reason="${err.message}"`);
                        forwardErrLogs += 1;
                    }
                    humeReady = false;
                    break;
                }
            }
            if (inboundQueue.length === 0) {
                logBridgeState('queue_flushed');
            }
        };

        const closeBridge = (reason) => {
            if (bridgeClosed) return;
            bridgeClosed = true;
            logBridgeState('closing', `reason=${reason} durationMs=${Date.now() - startedAt}`);
            if (outboundTick) {
                clearInterval(outboundTick);
                outboundTick = null;
            }
            try {
                if (humeSocket) humeSocket.close();
            } catch (_) { }
            try {
                if (ws.readyState === 1 || ws.readyState === 0) ws.close();
            } catch (_) { }
        };

        console.log(`🔌 [Voice] Telnyx stream connected. call_id: ${activeCallId}`);
        logBridgeState('telnyx_ws_connected');

        const enqueueOutboundPayload = (payloadBuf) => {
            if (!payloadBuf || payloadBuf.length === 0) return;
            if (outboundQueue.length + payloadBuf.length > TELNYX_OUTBOUND_QUEUE_MAX_BYTES) {
                const overflow = (outboundQueue.length + payloadBuf.length) - TELNYX_OUTBOUND_QUEUE_MAX_BYTES;
                outboundQueue = outboundQueue.slice(Math.min(overflow, outboundQueue.length));
                droppedFrames += 1;
            }
            outboundQueue = Buffer.concat([outboundQueue, payloadBuf]);
        };

        const startOutboundTicker = () => {
            if (outboundTick) return;
            outboundTick = setInterval(() => {
                if (bridgeClosed || ws.readyState !== 1) return;
                if (outboundQueue.length < TELNYX_PCMU_FRAME_BYTES) return;

                const frame = outboundQueue.slice(0, TELNYX_PCMU_FRAME_BYTES);
                outboundQueue = outboundQueue.slice(TELNYX_PCMU_FRAME_BYTES);

                ws.send(JSON.stringify({
                    event: 'media',
                    media: { payload: frame.toString('base64') },
                }));
                audioChunksSent++;
                outboundFrames++;
                if (audioChunksSent <= 5) {
                    console.log(`🔊 [Voice] Sent audio frame #${audioChunksSent} (${frame.length} bytes)`);
                }
            }, TELNYX_OUTBOUND_FRAME_MS);
        };

        // ── Connect to Hume ────────────────────────────────────────────────
        const connectHume = async () => {
            if (bridgeClosed || humeReady || humeConnecting) return;
            try {
                humeConnecting = true;
                const ctx = activeCallId ? callContextMap.get(activeCallId) : null;
                const systemPrompt = composeSystemPrompt(ctx || {});

                console.log(`🧠 [Voice] Connecting to Hume EVI (configId: ${HUME_CONFIG_ID})...`);
                humeSocket = await hume.empathicVoice.chat.connect({
                    configId: HUME_CONFIG_ID,
                });

                humeSocket.on('open', () => {
                    console.log('🧠 [Voice] Hume EVI connected ✅');
                    humeReady = true;
                    humeConnecting = false;
                    logBridgeState('hume_open');

                    // Send system prompt via session settings
                    if (systemPrompt) {
                        try {
                            humeSocket.sendSessionSettings({ systemPrompt });
                        } catch (e) {
                            console.warn('⚠️ Could not send session settings:', e.message);
                        }
                    }

                    // Trigger Hume to speak first (outbound call)
                    setTimeout(() => {
                        if (humeSocket && humeReady) {
                            try {
                                humeSocket.sendUserInput('...');
                                console.log('🎙️  [Voice] Triggered Hume greeting');
                            } catch (e) {
                                console.warn('⚠️ Trigger failed:', e.message);
                            }
                        }
                    }, 300);

                    flushInboundQueue().catch((err) => {
                        console.error(`${bridgeLabel()} queue_flush_error:`, err.message);
                    });
                });

                humeSocket.on('message', async (msg) => {
                    try {
                        if (msg.type === 'audio_output') {
                            const mulawBuf = humeAudioToTelnyxMulaw(msg.data);
                            if (!mulawBuf) return;
                            enqueueOutboundPayload(mulawBuf);
                            startOutboundTicker();
                        }

                        if (msg.type === 'user_message' || msg.type === 'assistant_message') {
                            const role = msg.type === 'user_message' ? 'user' : 'assistant';
                            const text = msg.message?.content || '';
                            console.log(`💬 [Voice] ${role}: ${text.substring(0, 120)}`);

                            const ctx = activeCallId ? callContextMap.get(activeCallId) : null;
                            if (ctx?.conversationId) {
                                supabase.from('messages').insert({
                                    conversation_id: ctx.conversationId,
                                    role, content: text,
                                    metadata: { call_id: activeCallId, ts: new Date().toISOString() },
                                }).catch(e => console.error('Transcript log error:', e.message));
                            }
                        }

                        if (msg.type === 'error') {
                            console.error('❌ [Voice] Hume error message:', JSON.stringify(msg));
                        }
                    } catch (e) {
                        console.error('❌ [Voice] Hume message handler error:', e.message);
                    }
                });

                humeSocket.on('error', (e) => {
                    console.error('❌ [Voice] Hume socket error:', e?.message || e);
                    humeReady = false;
                    humeConnecting = false;
                });

                humeSocket.on('close', () => {
                    console.log('👋 [Voice] Hume disconnected');
                    humeReady = false;
                    humeConnecting = false;
                });

            } catch (e) {
                console.error('❌ [Voice] Failed to connect to Hume:', e.message);
                humeReady = false;
                humeConnecting = false;
                if (VOICE_BRIDGE_STRICT_MODE) {
                    closeBridge('hume_connect_failed');
                }
            }
        };

        // ── Handle Telnyx messages ─────────────────────────────────────────
        ws.on('message', async (raw) => {
            if (bridgeClosed) return;
            try {
                const msg = JSON.parse(raw.toString());

                switch (msg.event) {
                    case 'connected':
                        console.log('✅ [Voice] Telnyx stream connected event received');
                        logBridgeState('telnyx_connected');
                        break;

                    case 'start':
                        streamSid = msg.start?.stream_sid || msg.streamSid || null;
                        const startCallId = msg.start?.call_sid
                            || msg.start?.custom_parameters?.call_id
                            || null;
                        if (!activeCallId && startCallId) activeCallId = startCallId;
                        console.log(`🎬 [Voice] Stream started. SID: ${streamSid} | callId: ${activeCallId}`);
                        logBridgeState('telnyx_start');
                        await connectHume();
                        break;

                    case 'media':
                        if (!msg.media?.payload) break;
                        if (humeSocket && humeReady) {
                            try {
                                await humeSocket.sendAudioInput({ data: msg.media.payload });
                                inboundFrames++;
                            } catch (e) {
                                enqueueInboundAudio(msg.media.payload);
                                humeReady = false;
                                if (forwardErrLogs < 5) {
                                    console.error('Error forwarding audio to Hume:', e.message);
                                    forwardErrLogs++;
                                }
                                connectHume().catch(() => { });
                            }
                        } else {
                            enqueueInboundAudio(msg.media.payload);
                        }
                        break;

                    case 'stop':
                        console.log('🛑 [Voice] Stream stopped');
                        closeBridge('telnyx_stop');
                        break;

                    default:
                        break;
                }
            } catch (e) {
                console.error('❌ [Voice] Error parsing WS message:', e.message);
            }
        });

        ws.on('close', () => {
            console.log('🔌 [Voice] Telnyx WS disconnected');
            closeBridge('telnyx_ws_closed');
        });

        ws.on('error', (e) => {
            console.error('❌ [Voice] Telnyx WS error:', e.message);
            closeBridge('telnyx_ws_error');
        });
    });
};

// ─── TeXML handler (kept for inbound calls only) ─────────────────────────────
const handleIncomingCall = (req, res) => {
    try {
        const body = req.body || {};
        const callControlId = body.CallSid || body.call_control_id || `call-${Date.now()}`;
        const to = body.To || body.to || '';
        const direction = (body.Direction || body.direction || '').toLowerCase();

        if (direction === 'outbound' || direction === 'outbound-api') {
            // This is the answered callback for a TeXML initiated outbound call
            // (shouldn't happen with Call Control API, but handle gracefully)
            const cleanTo = normalizePhone(to);
            const ctx = callContextMap.get(cleanTo);
            if (ctx && !callContextMap.has(callControlId)) {
                callContextMap.set(callControlId, ctx);
                console.log(`🔗 [Voice] Linked context for ${cleanTo} → ${callControlId}`);
            }
        }

        const streamUrl = buildStreamUrl(req, callControlId);
        console.log(`📞 [Voice] handleIncomingCall: ${callControlId} | streamUrl: ${streamUrl}`);

        res.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="${xmlEscape(streamUrl)}" track="both_tracks">
            <Parameter name="call_id" value="${xmlEscape(callControlId)}" />
        </Stream>
    </Connect>
</Response>`);
    } catch (e) {
        console.error('❌ [Voice] handleIncomingCall error:', e.message);
        res.status(500).type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
    }
};

module.exports = {
    handleIncomingCall,
    handleTelnyxEvent,
    initiateOutboundCall,
    attachVoiceBridge,
};
