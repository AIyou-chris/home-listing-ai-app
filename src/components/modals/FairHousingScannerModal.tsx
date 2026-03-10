import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { createChatkitSession } from '../../services/chatkitService';

type FairHousingScannerModalProps = {
  open: boolean;
  onClose: () => void;
  initialText?: string;
  contextLabel?: string;
};

type OpenAIChatKitElement = HTMLElement & {
  setOptions?: (options: unknown) => void;
  sendUserMessage?: (message: string) => Promise<void> | void;
  setComposerValue?: (message: string) => Promise<void> | void;
};

const CHATKIT_ELEMENT_TAG = 'openai-chatkit';
const CHATKIT_SCRIPT_SRC = 'https://cdn.platform.openai.com/deployments/chatkit/chatkit.js';

let chatKitScriptPromise: Promise<void> | null = null;

const waitForChatKitElement = (): Promise<void> =>
  new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 40;
    const tick = () => {
      if (typeof customElements !== 'undefined' && customElements.get(CHATKIT_ELEMENT_TAG)) {
        resolve();
        return;
      }
      attempts += 1;
      if (attempts >= maxAttempts) {
        reject(new Error('chatkit_script_not_ready'));
        return;
      }
      window.setTimeout(tick, 100);
    };
    tick();
  });

const ensureChatKitScript = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  if (typeof customElements !== 'undefined' && customElements.get(CHATKIT_ELEMENT_TAG)) return;
  if (chatKitScriptPromise) return chatKitScriptPromise;

  chatKitScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${CHATKIT_SCRIPT_SRC}"]`) as HTMLScriptElement | null;
    const onReady = async () => {
      try {
        await waitForChatKitElement();
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    const onError = () => reject(new Error('chatkit_script_load_failed'));

    if (existingScript) {
      existingScript.addEventListener('load', onReady, { once: true });
      existingScript.addEventListener('error', onError, { once: true });
      void onReady();
      return;
    }

    const script = document.createElement('script');
    script.src = CHATKIT_SCRIPT_SRC;
    script.async = true;
    script.addEventListener('load', onReady, { once: true });
    script.addEventListener('error', onError, { once: true });
    document.head.appendChild(script);
  });

  return chatKitScriptPromise;
};

const extractPlainText = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    return value.map((item) => extractPlainText(item)).filter(Boolean).join('\n').trim();
  }
  if (value && typeof value === 'object') {
    const candidate = value as Record<string, unknown>;
    return (
      extractPlainText(candidate.text) ||
      extractPlainText(candidate.value) ||
      extractPlainText(candidate.content) ||
      extractPlainText(candidate.message) ||
      extractPlainText(candidate.output) ||
      extractPlainText(candidate.parts)
    );
  }
  return '';
};

const findLatestAssistantText = (payload: unknown): string => {
  const queue: unknown[] = [payload];
  let fallback = '';

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    if (typeof current === 'string') {
      const text = current.trim();
      if (text.length > fallback.length) fallback = text;
      continue;
    }

    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }

    if (typeof current === 'object') {
      const record = current as Record<string, unknown>;
      const role = typeof record.role === 'string' ? record.role.toLowerCase() : '';
      const type = typeof record.type === 'string' ? record.type.toLowerCase() : '';
      const isAssistantLike = role === 'assistant' || type.includes('assistant');
      const text = extractPlainText(record.content ?? record.text ?? record.message ?? record.output);
      if (isAssistantLike && text) return text;
      if (text.length > fallback.length) fallback = text;
      queue.push(...Object.values(record));
    }
  }

  return fallback;
};

const FairHousingScannerModal: React.FC<FairHousingScannerModalProps> = ({
  open,
  onClose,
  initialText = '',
  contextLabel = 'Scanner'
}) => {
  const [textValue, setTextValue] = useState(initialText);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [chatReady, setChatReady] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [manualSendHint, setManualSendHint] = useState(false);
  const [latestAssistantMessage, setLatestAssistantMessage] = useState('');
  const chatMountRef = useRef<HTMLDivElement | null>(null);
  const chatElementRef = useRef<OpenAIChatKitElement | null>(null);
  const autoSendAttemptedRef = useRef(false);

  const workflowId = useMemo(
    () => String(import.meta.env.VITE_OPENAI_FAIR_HOUSING_WORKFLOW_ID || '').trim(),
    []
  );
  const chatkitPublicKey = useMemo(
    () => String(import.meta.env.VITE_OPENAI_CHATKIT_PUBLIC_KEY || '').trim(),
    []
  );

  useEffect(() => {
    if (!open) return;
    setTextValue(initialText || '');
    setSessionLoading(false);
    setSessionError(null);
    setChatReady(false);
    setClientSecret(null);
    setManualSendHint(false);
    setLatestAssistantMessage('');
    autoSendAttemptedRef.current = false;
  }, [initialText, open]);

  useEffect(() => {
    if (!open || !clientSecret || !chatMountRef.current) return;
    let cancelled = false;
    const mountPoint = chatMountRef.current;

    const onThreadChange = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      const text = findLatestAssistantText(detail);
      if (text) setLatestAssistantMessage(text);
    };

    const onChatError = (event: Event) => {
      const detail = (event as CustomEvent<{ error?: unknown }>).detail;
      const message = detail?.error instanceof Error ? detail.error.message : 'ChatKit failed to load.';
      setSessionError(message);
    };

    const setup = async () => {
      try {
        await ensureChatKitScript();
        if (cancelled) return;

        mountPoint.innerHTML = '';
        const element = document.createElement(CHATKIT_ELEMENT_TAG) as OpenAIChatKitElement;
        element.className = 'block h-full w-full';
        if (chatkitPublicKey) {
          element.setAttribute('public-key', chatkitPublicKey);
        }
        element.addEventListener('chatkit.thread.change', onThreadChange as EventListener);
        element.addEventListener('chatkit.error', onChatError as EventListener);

        mountPoint.appendChild(element);
        chatElementRef.current = element;

        element.setOptions?.({
          api: {
            getClientSecret: async () => clientSecret
          },
          ...(chatkitPublicKey ? { publicKey: chatkitPublicKey } : {}),
          theme: 'light',
          frameTitle: `Fair Housing Scan · ${contextLabel}`
        });

        const handleReady = async () => {
          setChatReady(true);
          if (autoSendAttemptedRef.current) return;
          autoSendAttemptedRef.current = true;
          const trimmedText = textValue.trim();
          if (!trimmedText) return;

          try {
            await element.setComposerValue?.(trimmedText);
            if (typeof element.sendUserMessage === 'function') {
              await element.sendUserMessage(trimmedText);
              setManualSendHint(false);
            } else {
              setManualSendHint(true);
            }
          } catch (_error) {
            setManualSendHint(true);
          }
        };

        element.addEventListener('chatkit.ready', handleReady as EventListener, { once: true });
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'ChatKit failed to initialize.';
        setSessionError(message);
      }
    };

    void setup();

    return () => {
      cancelled = true;
      if (chatElementRef.current) {
        chatElementRef.current.removeEventListener('chatkit.thread.change', onThreadChange as EventListener);
        chatElementRef.current.removeEventListener('chatkit.error', onChatError as EventListener);
      }
      mountPoint.innerHTML = '';
      chatElementRef.current = null;
    };
  }, [chatkitPublicKey, clientSecret, contextLabel, open, textValue]);

  if (!open) return null;

  const startScan = async () => {
    setSessionError(null);
    if (!workflowId) {
      setSessionError('Missing workflow ID. Set VITE_OPENAI_FAIR_HOUSING_WORKFLOW_ID.');
      return;
    }

    setSessionLoading(true);
    try {
      const session = await createChatkitSession(workflowId, 'production');
      setClientSecret(session.client_secret);
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : 'chatkit_session_failed');
    } finally {
      setSessionLoading(false);
    }
  };

  const copyResult = async () => {
    const valueToCopy = latestAssistantMessage.trim() || textValue.trim();
    if (!valueToCopy) {
      toast.error('Nothing to copy yet.');
      return;
    }
    try {
      await navigator.clipboard.writeText(valueToCopy);
      toast.success('Result copied.');
    } catch (_error) {
      toast.error('Copy failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-[90] bg-slate-950/60 backdrop-blur-sm">
      <div className="flex h-full w-full items-end justify-center p-0 sm:items-center sm:p-6">
        <div className="flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[92vh] sm:max-w-5xl sm:rounded-2xl">
          <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Fair Housing Scan</h2>
              <p className="mt-1 text-sm text-slate-600">
                Paste any listing description, caption, SMS, or email. We’ll flag risky phrases and suggest safer rewrites.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="ml-4 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Close
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Scan text</label>
            <textarea
              value={textValue}
              onChange={(event) => setTextValue(event.target.value)}
              rows={6}
              className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-100"
              placeholder="Paste text to scan…"
            />

            {sessionError && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {sessionError}
              </div>
            )}

            {clientSecret && (
              <div className="mt-4">
                {manualSendHint && (
                  <p className="mb-2 text-sm text-amber-700">
                    Paste the text above and press Send.
                  </p>
                )}
                {!chatReady && (
                  <p className="mb-2 text-sm text-slate-500">Loading scanner…</p>
                )}
                <div className="h-[56vh] min-h-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div ref={chatMountRef} className="h-full w-full" />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-5 py-4 sm:px-6">
            <span className="text-xs text-slate-500">{contextLabel}</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copyResult()}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Copy result
              </button>
              <button
                type="button"
                onClick={() => void startScan()}
                disabled={sessionLoading}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sessionLoading ? 'Starting…' : 'Start scan'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FairHousingScannerModal;
