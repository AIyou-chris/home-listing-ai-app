import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { agentOnboardingService, AgentRecord } from '../services/agentOnboardingService';
import LoadingSpinner from './LoadingSpinner';
import { Logo } from './Logo';
import { supabase } from '../services/supabase';
import { getEnvValue } from '../lib/env';

interface CheckoutPageProps {
  slug: string;
  onBackToSignup: () => void;
}

type ActivationState = 'pending' | 'activating' | 'active' | 'cancelled';

type PayPalApproveData = {
  orderID: string;
};

type PayPalNamespace = {
  Buttons: (options: {
    createOrder: () => Promise<string>;
    onApprove: (data: PayPalApproveData) => Promise<void>;
    onError: (err: unknown) => void;
  }) => { render: (selector: string) => void };
};

const extractErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error) return error.message || fallback;
  if (typeof error === 'object' && error !== null) {
    const candidate = error as { message?: unknown };
    if (typeof candidate.message === 'string' && candidate.message.trim().length > 0) {
      return candidate.message;
    }
  }
  return fallback;
};

const CheckoutPage: React.FC<CheckoutPageProps> = ({ slug, onBackToSignup }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [agent, setAgent] = useState<AgentRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreatingSession, setIsCreatingSession] = useState<boolean>(false);
  const [activationState, setActivationState] = useState<ActivationState>('pending');
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMsg, setContactMsg] = useState('');
  const [contactSending, setContactSending] = useState(false);
  const [contactSent, setContactSent] = useState(false);

  const dashboardBaseUrl = getEnvValue('VITE_DASHBOARD_BASE_URL') || 'https://aiyouagent.com';
  const dashboardUrl = useMemo(
    () => `${dashboardBaseUrl.replace(/\/$/, '')}/dashboard/${slug}`,
    [dashboardBaseUrl, slug]
  );

  const statusParam = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('status');
  }, [location.search]);

  useEffect(() => {
    const loadAgent = async () => {
      setIsLoading(true);
      try {
        const record = await agentOnboardingService.getAgentBySlug(slug);
        setAgent(record);
        if (record.status === 'active' || record.status === 'admin_test') {
          setActivationState('active');
        }
      } catch (err: unknown) {
        console.error('[CheckoutPage] Failed to load agent', err);
        setError(extractErrorMessage(err, 'Unable to load your registration. Please try again.'));
      } finally {
        setIsLoading(false);
      }
    };
    loadAgent();
  }, [slug]);

  const startActivationPolling = useCallback(() => {
    if (isPolling) return;
    setIsPolling(true);
    setActivationState('activating');
    setError(null);
    agentOnboardingService
      .pollAgentActivation({ slug })
      .then((record) => {
        setAgent(record);
        setActivationState('active');
      })
      .catch((err: unknown) => {
        console.error('[CheckoutPage] Activation polling failed', err);
        setError(extractErrorMessage(err, 'We could not confirm your payment yet. Please reach out to support.'));
        setActivationState('pending');
      })
      .finally(() => setIsPolling(false));
  }, [isPolling, slug]);

  useEffect(() => {
    if (statusParam === 'success') {
      startActivationPolling();
    } else if (statusParam === 'cancelled') {
      setActivationState('cancelled');
    }
  }, [statusParam, startActivationPolling]);

  const loadPayPalSdk = useCallback(async () => {
    if (paypalLoaded) return;
    const clientId = getEnvValue('VITE_PAYPAL_CLIENT_ID') || '';
    if (!clientId) {
      setError('PayPal client ID is not configured.');
      return;
    }
    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-paypal-sdk]');
      if (existing) {
        setPaypalLoaded(true);
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&intent=capture&currency=USD`;
      script.async = true;
      script.defer = true;
      script.setAttribute('data-paypal-sdk', 'true');
      script.onload = () => {
        setPaypalLoaded(true);
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load PayPal SDK'));
      document.body.appendChild(script);
    });
  }, [paypalLoaded, setError]);

  const renderPayPalButtons = useCallback(async () => {
    const paypalNamespace = (window as typeof window & { paypal?: PayPalNamespace }).paypal;
    if (!paypalNamespace?.Buttons) {
      return;
    }

    const container = document.getElementById('paypal-buttons');
    if (!container) {
      return;
    }
    container.innerHTML = '';

    try {
      paypalNamespace
        .Buttons({
          createOrder: async () => {
            const response = await fetch('/api/paypal/create-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                amount: agent?.plan_amount || 59,
                currency: agent?.plan_currency || 'USD',
                description: agent
                  ? `HomeListingAI plan for ${agent.first_name}`
                  : 'HomeListingAI subscription',
                referenceId: slug
              })
            });
            const data = await response.json();
            if (!response.ok || !data?.id) {
              throw new Error('Failed to create PayPal order');
            }
            return data.id as string;
          },
          onApprove: async (data: PayPalApproveData) => {
            const { data: userData } = await supabase.auth.getUser();
            const xUserId = userData?.user?.id || '';
            const response = await fetch('/api/paypal/capture-order', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(xUserId ? { 'x-user-id': xUserId } : {})
              },
              body: JSON.stringify({ orderId: data.orderID })
            });
            const capture = await response.json();
            if (!response.ok || capture?.status !== 'COMPLETED') {
              setError('Payment capture failed. Please contact support.');
              return;
            }
            startActivationPolling();
          },
          onError: (err: unknown) => {
            console.error('PayPal error', err);
            setError('PayPal experienced an error. Please try again.');
          }
        })
        .render('#paypal-buttons');
    } catch (err) {
      console.error('PayPal render error', err);
      setError('Could not render PayPal buttons. Please refresh and try again.');
    }
  }, [agent, setError, slug, startActivationPolling]);

  const isActive = activationState === 'active';

  useEffect(() => {
    if (isActive) {
      return;
    }

    let cancelled = false;
    loadPayPalSdk()
      .then(() => {
        if (!cancelled) {
          return renderPayPalButtons();
        }
        return undefined;
      })
      .catch((err: unknown) => {
        console.error('[CheckoutPage] Failed to initialise PayPal', err);
        setError(prev => prev ?? 'Could not initialise PayPal checkout. Please refresh and try again.');
      });

    return () => {
      cancelled = true;
    };
  }, [isActive, loadPayPalSdk, renderPayPalButtons, setError]);

  const handleCheckout = async (provider?: 'stripe' | 'paypal') => {
    setError(null);
    setIsCreatingSession(true);
    try {
      const checkoutProvider = provider ?? 'paypal';
      const session = await agentOnboardingService.createCheckoutSession({
        slug,
        provider: checkoutProvider
      });
      if (session?.url) {
        window.location.href = session.url;
      } else {
        setError('Checkout session did not return a redirect URL. Please contact support.');
      }
    } catch (err: unknown) {
      console.error('[CheckoutPage] Failed to create checkout session', err);
      setError(extractErrorMessage(err, 'We were unable to start checkout. Please try again.'));
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleBackHome = () => {
    navigate('/', { replace: true });
  };

  const submitContact = async () => {
    if (!contactName.trim() || !contactEmail.trim() || !contactMsg.trim()) return;
    setContactSending(true);
    try {
      await fetch('/api/security/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertType: 'contact',
          description: `Checkout question from ${contactName} <${contactEmail}>: ${contactMsg}`,
          severity: 'info'
        })
      });
      setContactSent(true);
      setTimeout(() => {
        setIsContactOpen(false);
        setContactSent(false);
        setContactName(''); setContactEmail(''); setContactMsg('');
      }, 1200);
    } catch {
      // keep modal open; optionally surface error state
    } finally {
      setContactSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-10">
          <button type="button" onClick={onBackToSignup} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary-500 transition">
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back to signup
          </button>
          <div className="flex items-center gap-3">
            <button type="button" onClick={handleBackHome} className="hidden sm:flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary-500 transition">
              <span className="material-symbols-outlined text-base">home</span>
              Home
            </button>
            <button type="button" onClick={() => setIsContactOpen(true)} className="hidden sm:flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary-500 transition">
              <span className="material-symbols-outlined text-base">support_agent</span>
              Contact
            </button>
            <Logo className="w-12 h-12" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="px-8 py-10 bg-gradient-to-r from-indigo-600 to-sky-500 text-white">
            <p className="uppercase text-xs tracking-[0.2em] opacity-80 mb-2">Agent Checkout</p>
            <h1 className="text-3xl font-bold">
              {agent ? `Secure your AI dashboard, ${agent.first_name}!` : 'Secure your AI dashboard'}
            </h1>
            <p className="text-sm text-indigo-100 mt-3 max-w-2xl">
              Complete payment to activate your AI Agent workspace. We will automatically generate your dashboard, preload funnels, and email your credentials the moment the payment clears.
            </p>
            <div className="mt-6 flex flex-wrap gap-4 text-xs uppercase tracking-wide">
              <span className="bg-white/20 px-3 py-1 rounded-full">Slug: {slug}</span>
              <span className="bg-white/20 px-3 py-1 rounded-full">
                Status: {activationState === 'pending' ? 'Waiting for payment' : activationState === 'activating' ? 'Activating' : activationState === 'active' ? 'Active' : 'Cancelled'}
              </span>
            </div>
          </div>

          <div className="px-8 py-10 space-y-8">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <LoadingSpinner text="Loading your registration..." />
              </div>
            ) : (
              <>
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                    {error}
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="p-5 border border-slate-200 rounded-xl">
                    <h2 className="font-semibold text-slate-800">What happens after checkout</h2>
                    <ul className="mt-4 space-y-3 text-sm text-slate-600">
                      <li className="flex gap-3">
                        <span className="material-symbols-outlined text-indigo-500 text-base mt-0.5">bolt</span>
                        <div>
                          <p className="font-semibold text-slate-700">Automatic activation</p>
                          <p>Your dashboard and AI modules are provisioned instantly when the payment success webhook fires.</p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <span className="material-symbols-outlined text-indigo-500 text-base mt-0.5">mail</span>
                        <div>
                          <p className="font-semibold text-slate-700">Credentials sent securely</p>
                          <p>We email a temporary Supabase password you can change after login.</p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <span className="material-symbols-outlined text-indigo-500 text-base mt-0.5">history</span>
                        <div>
                          <p className="font-semibold text-slate-700">Versioned templates</p>
                          <p>Your funnels and message templates ship with defaults and 1-click revert history.</p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <span className="material-symbols-outlined text-emerald-600 text-base mt-0.5">verified_user</span>
                        <div>
                          <p className="font-semibold text-slate-700">30‑Day Money‑Back Guarantee</p>
                          <p>Don’t love it? Cancel within 30 days for a full refund—no questions asked.</p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <span className="material-symbols-outlined text-indigo-500 text-base mt-0.5">shield_lock</span>
                        <div>
                          <p className="font-semibold text-slate-700">Secure payments via PayPal</p>
                          <p>We never store your card. Manage your subscription anytime from Billing.</p>
                        </div>
                      </li>
                    </ul>
                    <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-3">
                      <span className="material-symbols-outlined text-[18px] text-slate-600">help</span>
                      <div className="flex-1">
                        <p className="text-sm text-slate-700 font-medium">Questions before you buy?</p>
                        <p className="text-xs text-slate-500">We’re happy to help. Ask anything—no pressure.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsContactOpen(true)}
                        className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 hover:border-indigo-500 hover:text-indigo-600 transition"
                      >
                        Contact us
                      </button>
                    </div>
                  </div>

                  <div className="p-5 border border-slate-200 rounded-xl">
                    <h2 className="font-semibold text-slate-800">Your plan</h2>
                    <div className="mt-4 bg-gradient-to-tr from-primary-700 to-primary-500 text-white rounded-2xl p-6 shadow-2xl border-2 border-primary-500">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-lg font-bold">Complete AI Solution</p>
                          <p className="text-sm text-white/80 mt-1">Everything you need to launch and grow.</p>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-extrabold">$139</div>
                          <div className="text-sm text-white/80">/month</div>
                        </div>
                      </div>
                      <ul className="mt-4 grid grid-cols-1 gap-2 text-sm">
                        <li className="flex items-center gap-2"><span className="material-symbols-outlined text-white">check_circle</span> Unlimited AI interactions</li>
                        <li className="flex items-center gap-2"><span className="material-symbols-outlined text-white">check_circle</span> Listing app + lead capture</li>
                        <li className="flex items-center gap-2"><span className="material-symbols-outlined text-white">check_circle</span> Marketing automations</li>
                        <li className="flex items-center gap-2"><span className="material-symbols-outlined text-white">check_circle</span> Analytics dashboard</li>
                      </ul>
                      <div className="mt-5 bg-white/10 rounded-lg p-3 text-sm flex items-center gap-2">
                        <span className="material-symbols-outlined text-white">verified_user</span>
                        <span>30‑Day Money‑Back Guarantee</span>
                      </div>
                    </div>
                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={() => handleCheckout('paypal')}
                        disabled={isCreatingSession}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-slate-300 text-sm font-semibold transition ${isCreatingSession ? 'opacity-70 cursor-not-allowed' : 'hover:border-indigo-500 hover:text-indigo-600'}`}
                      >
                        <span className="material-symbols-outlined text-base">account_balance</span>
                        {isCreatingSession ? 'Preparing PayPal…' : 'Checkout with PayPal'}
                      </button>
                      {/* Powered by PayPal and trust note retained below */}
                      <div id="paypal-buttons" className="mt-4" />
                    </div>
                    <div className="mt-4 text-xs text-slate-500 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-emerald-600">verified</span>
                      <span>Secure checkout. Cancel anytime from Billing.</span>
                    </div>
                    <div className="mt-2 text-[10px] text-slate-400">Powered by <span className="font-semibold">PayPal</span></div>
                  </div>
                </div>

                {!isActive && (
                  <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-600 flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-base text-indigo-500">loop</span>
                      <div>
                        <p className="font-semibold text-slate-700">Waiting for payment confirmation</p>
                        <p>Stay on this page after checkout. We will refresh once your payment is confirmed.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={startActivationPolling}
                      disabled={isPolling}
                      className={`px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 transition ${isPolling ? 'opacity-70 cursor-not-allowed' : 'hover:border-indigo-500 hover:text-indigo-600'}`}
                    >
                      {isPolling ? 'Checking status...' : 'Check status now'}
                    </button>
                  </div>
                )}

                {isActive && (
                  <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-900">
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-base text-emerald-500 mt-0.5">check_circle</span>
                      <div>
                        <p className="font-semibold text-emerald-700">Payment confirmed!</p>
                        <p className="mt-1">
                          Your dashboard is live and your welcome email is on the way. Use the button below to log in with the credentials we emailed.
                        </p>
                        <div className="mt-4 flex gap-3">
                          <a
                            href={dashboardUrl}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold shadow hover:bg-emerald-500 transition"
                          >
                            <span className="material-symbols-outlined text-base">open_in_new</span>
                            Open my dashboard
                          </a>
                          <button
                            type="button"
                            onClick={() => navigate('/app/settings?tab=billing')}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-500 text-emerald-700 font-semibold hover:bg-emerald-100 transition"
                          >
                            <span className="material-symbols-outlined text-base">credit_card</span>
                            Manage billing
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate('/app/dashboard')}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-500 text-emerald-700 font-semibold hover:bg-emerald-100 transition"
                          >
                            <span className="material-symbols-outlined text-base">space_dashboard</span>
                            View sample dashboard
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-10 py-8 text-sm text-slate-500">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">lock</span>
              <span>Secure checkout • 30‑Day Money‑Back Guarantee</span>
            </div>
            <div className="flex items-center gap-4">
              <a href="/privacy-policy.html" className="hover:text-slate-700">Privacy</a>
              <a href="/terms-of-service.html" className="hover:text-slate-700">Terms</a>
              <a href="/refund-policy.html" className="hover:text-slate-700">Refunds</a>
              <button onClick={() => setIsContactOpen(true)} className="hover:text-slate-700">Contact</button>
            </div>
          </div>
        </footer>
      </div>

      {/* Contact Modal */}
      {isContactOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-600">support_agent</span>
                <h3 className="font-semibold text-slate-900">Contact sales</h3>
              </div>
              <button onClick={() => setIsContactOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input value={contactName} onChange={e => setContactName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input value={contactEmail} onChange={e => setContactEmail(e.target.value)} type="email" className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">How can we help?</label>
                <textarea value={contactMsg} onChange={e => setContactMsg(e.target.value)} rows={4} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-500">We’ll reply within 1 business day.</div>
                <button
                  onClick={submitContact}
                  disabled={contactSending || !contactName.trim() || !contactEmail.trim() || !contactMsg.trim()}
                  className={`px-4 py-2 rounded-lg text-white text-sm font-semibold ${contactSending ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                  {contactSending ? 'Sending…' : contactSent ? 'Sent!' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;
