import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildApiUrl } from '../../lib/api';
import { Property } from '../../types';

const VISITOR_STORAGE_KEY = 'hlai_public_listing_visitor_id';
const SESSION_STORAGE_PREFIX = 'hlai_public_listing_session_';
const ATTRIBUTION_STORAGE_PREFIX = 'hlai_public_listing_attribution_';

type ChatSender = 'visitor' | 'ai' | 'system';
type ChatTab = 'chat' | 'voice';
type VoiceStatus = 'idle' | 'requesting' | 'listening' | 'error';

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript?: string };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

interface ChatMessage {
  id: string;
  sender: ChatSender;
  text: string;
  created_at: string;
}

interface PublicListingChatModuleProps {
  property: Property;
  listingSlug?: string;
  open?: boolean;
  hideLauncher?: boolean;
  onOpenChange?: (open: boolean) => void;
  demoMode?: boolean;
}

const DEFAULT_SUGGESTED = [
  'Is it still available?',
  'Can I see it this weekend?',
  'Any HOA or monthly cost?'
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

const looksLikePhone = (value: string) => value.replace(/\D/g, '').length >= 10;
const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (value.trim().startsWith('+')) return value.trim();
  return digits ? `+${digits}` : null;
};

const formatRelativeTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const deltaSeconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  if (deltaSeconds < 60) return `${deltaSeconds}s`;
  const deltaMinutes = Math.floor(deltaSeconds / 60);
  if (deltaMinutes < 60) return `${deltaMinutes}m`;
  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) return `${deltaHours}h`;
  return `${Math.floor(deltaHours / 24)}d`;
};

const getSpeechRecognitionCtor = () => {
  if (typeof window === 'undefined') return null;
  const speechWindow = window as Window & {
    webkitSpeechRecognition?: SpeechRecognitionCtor;
    SpeechRecognition?: SpeechRecognitionCtor;
  };
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition || null;
};

const buildFallbackResponse = (question: string, property: Property) => {
  const text = question.toLowerCase();
  const address = property.address || 'this home';
  if (text.includes('available')) {
    return `This home at ${address} is currently listed. Want me to help you book a showing window?`;
  }
  if (text.includes('hoa')) {
    return 'HOA details are not listed in this preview. I can help you request full disclosures from the agent.';
  }
  if (text.includes('school')) {
    return 'I can share nearby school context and commute notes once the agent confirms your preferred area details.';
  }
  if (text.includes('price')) {
    return `Current listed price is $${Number(property.price || 0).toLocaleString('en-US')}.`;
  }
  if (text.includes('showing') || text.includes('tour')) {
    return 'Great. Use the Showing button to request a tour and the agent will confirm the best time.';
  }
  return `I can answer basics for ${address} right now. Tell me what matters most: price, showings, neighborhood, or property features.`;
};

const PublicListingChatModule: React.FC<PublicListingChatModuleProps> = ({
  property,
  listingSlug,
  open,
  hideLauncher = false,
  onOpenChange,
  demoMode = false
}) => {
  const isControlled = typeof open === 'boolean';
  const [localOpen, setLocalOpen] = useState(false);
  const isOpen = isControlled ? Boolean(open) : localOpen;

  const setOpenState = (nextOpen: boolean) => {
    if (!isControlled) setLocalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const [activeTab, setActiveTab] = useState<ChatTab>('chat');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>(DEFAULT_SUGGESTED);
  const [inputValue, setInputValue] = useState('');
  const [captureRequired, setCaptureRequired] = useState(false);
  const [capturePrompt, setCapturePrompt] = useState(
    "Want the 1-page report + showing options? What's the best email or phone?"
  );
  const [captureName, setCaptureName] = useState('');
  const [captureContact, setCaptureContact] = useState('');
  const [captureConsent, setCaptureConsent] = useState(false);
  const [captureSubmitting, setCaptureSubmitting] = useState(false);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useLocalFallback, setUseLocalFallback] = useState(Boolean(demoMode));

  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    setConversationId(null);
    setMessages([]);
    setLeadCaptured(false);
    setUseLocalFallback(Boolean(demoMode));
    setError(null);
  }, [demoMode, property.id]);

  useEffect(() => {
    if (!isOpen) return;
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [isOpen, messages]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_error) {
          // noop
        }
      }
    };
  }, []);

  const attribution = useMemo(() => {
    const raw = localStorage.getItem(`${ATTRIBUTION_STORAGE_PREFIX}${property.id}`);
    if (!raw) return {};
    try {
      return JSON.parse(raw) as Record<string, string | null>;
    } catch (_error) {
      return {};
    }
  }, [property.id]);

  const pushMessage = (sender: ChatSender, text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${sender}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        sender,
        text,
        created_at: new Date().toISOString()
      }
    ]);
  };

  const ensureFallbackGreeting = useCallback(() => {
    setMessages((prev) => {
      if (prev.length > 0) return prev;
      return [
        {
          id: 'fallback-greeting',
          sender: 'ai',
          text: `Hi, I can help with questions about ${property.address || 'this home'}. Ask me about price, showings, or features.`,
          created_at: new Date().toISOString()
        }
      ];
    });
  }, [property.address]);

  useEffect(() => {
    if (!isOpen || conversationId || useLocalFallback) {
      if (isOpen && useLocalFallback) ensureFallbackGreeting();
      return;
    }

    const bootstrap = async () => {
      setLoading(true);
      setError(null);
      try {
        const existingVisitor = localStorage.getItem(VISITOR_STORAGE_KEY);
        const nextVisitorId =
          existingVisitor && existingVisitor.trim()
            ? existingVisitor
            : (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                ? crypto.randomUUID()
                : `visitor_${Date.now()}`);
        localStorage.setItem(VISITOR_STORAGE_KEY, nextVisitorId);
        setVisitorId(nextVisitorId);

        const response = await fetch(buildApiUrl('/api/public/conversations/start'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            listing_slug: listingSlug || null,
            listing_id: property.id,
            visitor_id: nextVisitorId,
            source_key: attribution.source_key || null,
            source_type: attribution.source_type || null,
            utm_source: attribution.utm_source || null,
            utm_medium: attribution.utm_medium || null,
            utm_campaign: attribution.utm_campaign || null,
            referrer_domain: attribution.referrer_domain || null,
            landing_path: window.location.pathname + window.location.search
          })
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(String(payload.error || 'failed_to_start_conversation'));

        const nextConversationId = String(payload.conversation_id || '');
        if (!nextConversationId) throw new Error('missing_conversation_id');
        setConversationId(nextConversationId);
        localStorage.setItem(`${SESSION_STORAGE_PREFIX}${property.id}`, nextConversationId);

        const initialMessages = Array.isArray(payload.messages)
          ? payload.messages.map((row: Record<string, unknown>, index: number): ChatMessage => ({
              id: String(row.id || `msg_${index}`),
              sender: String(row.sender || 'ai').toLowerCase() === 'visitor' ? 'visitor' : 'ai',
              text: String(row.text || ''),
              created_at: String(row.created_at || new Date().toISOString())
            }))
          : [];

        if (initialMessages.length === 0) {
          initialMessages.push({
            id: 'greeting',
            sender: 'ai',
            text: 'Ask me anything about this home.',
            created_at: new Date().toISOString()
          });
        }

        setMessages(initialMessages);
        setSuggestedQuestions(
          Array.isArray(payload.suggested_questions) && payload.suggested_questions.length > 0
            ? payload.suggested_questions.map((value: unknown) => String(value))
            : DEFAULT_SUGGESTED
        );
        if (payload.lead_id) setLeadCaptured(true);
      } catch (_bootstrapError) {
        setError('Live assistant is temporarily unavailable. Using listing basics for now.');
        setUseLocalFallback(true);
        ensureFallbackGreeting();
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, [attribution, conversationId, ensureFallbackGreeting, isOpen, listingSlug, property.address, property.id, useLocalFallback]);

  const sendMessage = async (text: string) => {
    const clean = text.trim();
    if (!clean) return;

    setInputValue('');
    setCaptureRequired(false);
    setError(null);
    setActiveTab('chat');
    pushMessage('visitor', clean);
    setLoading(true);

    if (useLocalFallback || !conversationId || !visitorId) {
      await new Promise((resolve) => window.setTimeout(resolve, 480));
      pushMessage('ai', buildFallbackResponse(clean, property));
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        buildApiUrl(`/api/public/conversations/${encodeURIComponent(conversationId)}/message`),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: clean,
            visitor_id: visitorId,
            listing_id: property.id,
            listing_slug: listingSlug || null
          })
        }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 429) {
          pushMessage('ai', 'Try again in a moment.');
          setLoading(false);
          return;
        }
        throw new Error(String(payload.error || 'failed_to_send_message'));
      }

      pushMessage('ai', String(payload.ai_text || 'I can help with this home.'));
      const shouldCapture = Boolean(payload.capture_required) && !leadCaptured;
      setCaptureRequired(shouldCapture);
      if (shouldCapture) {
        setCapturePrompt(
          String(payload.capture_prompt || "Want the 1-page report + showing options? What's the best email or phone?")
        );
      }
      if (Array.isArray(payload.suggested_questions) && payload.suggested_questions.length > 0) {
        setSuggestedQuestions(payload.suggested_questions.map((value: unknown) => String(value)));
      }
    } catch (_sendError) {
      setError('Live assistant failed to respond. I can still answer basic listing questions now.');
      setUseLocalFallback(true);
      pushMessage('ai', buildFallbackResponse(clean, property));
    } finally {
      setLoading(false);
    }
  };

  const submitCapture = async () => {
    if (!conversationId || !visitorId) return;
    const contact = captureContact.trim();
    if (!contact) {
      setError('Enter an email or phone.');
      return;
    }

    const isEmail = EMAIL_REGEX.test(contact);
    const isPhone = looksLikePhone(contact);
    if (!isEmail && !isPhone) {
      setError('Enter a valid email or phone.');
      return;
    }

    const normalizedPhone = isPhone ? normalizePhone(contact) : null;
    if (isPhone && !captureConsent) {
      setError('Please confirm consent before submitting a phone number.');
      return;
    }

    setCaptureSubmitting(true);
    setError(null);

    try {
      const response = await fetch(buildApiUrl('/api/leads/capture'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: property.id,
          visitor_id: visitorId,
          conversation_id: conversationId,
          full_name: captureName || undefined,
          phone: normalizedPhone || undefined,
          email: isEmail ? contact.toLowerCase() : undefined,
          consent_sms: normalizedPhone ? Boolean(captureConsent) : false,
          source_type: attribution.source_type || 'link',
          source_key: attribution.source_key || null,
          source_meta: {
            utm_source: attribution.utm_source || null,
            utm_medium: attribution.utm_medium || null,
            utm_campaign: attribution.utm_campaign || null,
            referrer_domain: attribution.referrer_domain || null,
            landing_path: window.location.pathname + window.location.search,
            test: false
          },
          context: 'general_info'
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(payload.error || 'failed_to_capture_lead'));

      setLeadCaptured(true);
      setCaptureRequired(false);
      setCaptureName('');
      setCaptureContact('');
      setCaptureConsent(false);
      pushMessage('ai', 'Got it. I sent your details to the listing agent. Want to request a showing window?');
    } catch (_captureError) {
      setError('Failed to capture contact right now.');
    } finally {
      setCaptureSubmitting(false);
    }
  };

  const stopVoice = () => {
    if (!recognitionRef.current) {
      setVoiceStatus('idle');
      return;
    }

    try {
      recognitionRef.current.stop();
    } catch (_error) {
      // noop
    }
    setVoiceStatus('idle');
  };

  const startVoice = async () => {
    setVoiceError(null);
    setVoiceTranscript('');
    setVoiceStatus('requesting');

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('microphone_not_supported');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());

      const RecognitionCtor = getSpeechRecognitionCtor();
      if (!RecognitionCtor) {
        throw new Error('speech_recognition_not_supported');
      }

      const recognition = new RecognitionCtor();
      recognitionRef.current = recognition;
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setVoiceStatus('listening');
      };

      recognition.onerror = () => {
        setVoiceStatus('error');
        setVoiceError('Voice temporarily unavailable. Please use Chat for now.');
      };

      recognition.onend = () => {
        setVoiceStatus((prev) => (prev === 'error' ? 'error' : 'idle'));
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let interim = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const transcript = String(event.results[i][0]?.transcript || '');
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interim += transcript;
          }
        }

        setVoiceTranscript(interim || finalTranscript);

        if (finalTranscript.trim()) {
          setVoiceStatus('idle');
          setVoiceTranscript('');
          void sendMessage(finalTranscript.trim());
        }
      };

      recognition.start();
    } catch (_error) {
      setVoiceStatus('error');
      setVoiceError('Voice temporarily unavailable. Please use Chat for now.');
    }
  };

  return (
    <>
      {!hideLauncher && !isOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-[min(94vw,380px)]">
          <button
            onClick={() => setOpenState(true)}
            className="w-full rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-700 to-blue-600 px-4 py-3 text-left text-sm font-semibold text-white shadow-xl transition hover:brightness-110"
          >
            Talk to the Home
          </button>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-end md:items-stretch md:justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]"
            onClick={() => setOpenState(false)}
            aria-label="Close Talk to the Home panel"
          />

          <section className="relative z-10 flex h-[88vh] w-full flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl md:h-full md:max-w-[430px] md:rounded-none md:rounded-l-3xl">
            <header className="bg-gradient-to-r from-slate-900 via-indigo-700 to-blue-600 px-4 py-4 text-white">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold">Talk to the Home</p>
                  <p className="truncate text-xs text-blue-100">{property.address || 'Listing assistant'}</p>
                </div>
                <button
                  onClick={() => setOpenState(false)}
                  className="rounded-full bg-white/20 p-1.5 text-white transition hover:bg-white/30"
                  aria-label="Close Talk to the Home"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <div className="mt-3 inline-flex rounded-xl bg-white/15 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('chat')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    activeTab === 'chat' ? 'bg-white text-slate-900' : 'text-white/85 hover:bg-white/20'
                  }`}
                >
                  Chat
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('voice')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    activeTab === 'voice' ? 'bg-white text-slate-900' : 'text-white/85 hover:bg-white/20'
                  }`}
                >
                  Voice
                </button>
              </div>
            </header>

            {activeTab === 'chat' ? (
              <>
                <div ref={transcriptRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === 'visitor' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                          message.sender === 'visitor'
                            ? 'rounded-br-sm bg-slate-900 text-white'
                            : 'rounded-tl-sm bg-white text-slate-800 shadow-sm border border-slate-200'
                        }`}
                      >
                        <p>{message.text}</p>
                        <span className="mt-1 block text-[10px] opacity-70">{formatRelativeTime(message.created_at)}</span>
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="w-fit rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-sm">Thinking...</div>
                  )}
                  {error && (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">{error}</div>
                  )}
                </div>

                {captureRequired && !leadCaptured && (
                  <div className="space-y-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold text-slate-700">{capturePrompt}</p>
                    <input
                      value={captureName}
                      onChange={(event) => setCaptureName(event.target.value)}
                      placeholder="Name (optional)"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                    />
                    <input
                      value={captureContact}
                      onChange={(event) => setCaptureContact(event.target.value)}
                      placeholder="Email or phone"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                    />
                    {looksLikePhone(captureContact) && (
                      <label className="flex items-start gap-2 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={captureConsent}
                          onChange={(event) => setCaptureConsent(event.target.checked)}
                          className="mt-0.5"
                        />
                        Yes, you can text me about this home.
                      </label>
                    )}
                    <button
                      onClick={() => void submitCapture()}
                      disabled={captureSubmitting}
                      className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                    >
                      {captureSubmitting ? 'Submitting...' : 'Submit'}
                    </button>
                  </div>
                )}

                <div className="space-y-2 border-t border-slate-200 px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {suggestedQuestions.slice(0, 3).map((question) => (
                      <button
                        key={question}
                        onClick={() => void sendMessage(question)}
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={inputValue}
                      onChange={(event) => setInputValue(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void sendMessage(inputValue);
                        }
                      }}
                      placeholder="Ask a question..."
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                    />
                    <button
                      onClick={() => void sendMessage(inputValue)}
                      disabled={loading}
                      className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-5 bg-slate-50 px-6 py-8 text-center">
                <div className={`relative flex h-28 w-28 items-center justify-center rounded-full border border-slate-200 bg-white shadow ${voiceStatus === 'listening' ? 'animate-pulse' : ''}`}>
                  <span className="material-symbols-outlined text-4xl text-slate-700">mic</span>
                </div>

                <div className="space-y-1">
                  <p className="text-base font-bold text-slate-900">
                    {voiceStatus === 'listening'
                      ? 'Listening...'
                      : voiceStatus === 'requesting'
                        ? 'Requesting microphone...'
                        : 'Ask by voice'}
                  </p>
                  <p className="text-sm text-slate-600">
                    {voiceTranscript || 'Tap Start voice, speak your question, and I will reply here.'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {voiceStatus === 'listening' ? (
                    <button
                      type="button"
                      onClick={stopVoice}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Stop
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void startVoice()}
                      className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Start voice
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveTab('chat')}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Use chat
                  </button>
                </div>

                {voiceError && (
                  <div className="w-full max-w-sm rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    {voiceError}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
};

export default PublicListingChatModule;
