import React, { useEffect, useMemo, useRef, useState } from 'react';
import { buildApiUrl } from '../../lib/api';
import { Property } from '../../types';

const VISITOR_STORAGE_KEY = 'hlai_public_listing_visitor_id';
const SESSION_STORAGE_PREFIX = 'hlai_public_listing_session_';
const ATTRIBUTION_STORAGE_PREFIX = 'hlai_public_listing_attribution_';

type ChatSender = 'visitor' | 'ai' | 'system';

interface ChatMessage {
  id: string;
  sender: ChatSender;
  text: string;
  created_at: string;
}

interface PublicListingChatModuleProps {
  property: Property;
  listingSlug?: string;
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

const PublicListingChatModule: React.FC<PublicListingChatModuleProps> = ({ property, listingSlug }) => {
  const [open, setOpen] = useState(false);
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
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages, open]);

  const attribution = useMemo(() => {
    const raw = localStorage.getItem(`${ATTRIBUTION_STORAGE_PREFIX}${property.id}`);
    if (!raw) return {};
    try {
      return JSON.parse(raw) as Record<string, string | null>;
    } catch (_error) {
      return {};
    }
  }, [property.id]);

  useEffect(() => {
    if (!open || conversationId) return;

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
      } catch (bootstrapError) {
        setError(bootstrapError instanceof Error ? bootstrapError.message : 'Unable to start chat.');
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, [attribution, conversationId, listingSlug, open, property.id]);

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

  const sendMessage = async (text: string) => {
    const clean = text.trim();
    if (!clean || !conversationId || !visitorId) return;

    setInputValue('');
    setCaptureRequired(false);
    setError(null);
    pushMessage('visitor', clean);
    setLoading(true);

    try {
      const response = await fetch(
        buildApiUrl(`/api/public/conversations/${encodeURIComponent(conversationId)}/message`),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: clean,
            visitor_id: visitorId
          })
        }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 429) {
          pushMessage('ai', 'Try again in a moment.');
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
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Failed to send message.');
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
      pushMessage('ai', 'Got it. Want to request a showing window?');
    } catch (captureError) {
      setError(captureError instanceof Error ? captureError.message : 'Failed to capture contact.');
    } finally {
      setCaptureSubmitting(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(94vw,380px)]">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-left text-sm font-semibold text-white shadow-xl transition hover:bg-slate-800"
        >
          Ask about this home
        </button>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Ask about this home</h3>
              <p className="text-xs text-slate-500">Fast answers from listing details.</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              aria-label="Close chat"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <div ref={transcriptRef} className="max-h-64 space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'visitor' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    message.sender === 'visitor'
                      ? 'rounded-br-sm bg-slate-900 text-white'
                      : 'rounded-tl-sm bg-slate-100 text-slate-800'
                  }`}
                >
                  <p>{message.text}</p>
                  <span className="mt-1 block text-[10px] opacity-70">{formatRelativeTime(message.created_at)}</span>
                </div>
              </div>
            ))}
            {loading && (
              <div className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-500">Thinking...</div>
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
                disabled={!conversationId || loading}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                Send
              </button>
            </div>
            {error && <p className="text-xs text-rose-600">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicListingChatModule;
