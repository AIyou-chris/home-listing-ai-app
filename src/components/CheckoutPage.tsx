import React, { useEffect, useMemo, useState } from 'react';
import { agentOnboardingService, AgentRecord } from '../services/agentOnboardingService';
import LoadingSpinner from './LoadingSpinner';
import { Logo } from './Logo';

interface CheckoutPageProps {
  slug: string;
  onBackToSignup: () => void;
}

type ActivationState = 'pending' | 'activating' | 'active' | 'cancelled';

const parseStatusParam = (): string | null => {
  const hash = window.location.hash || '';
  const queryIndex = hash.indexOf('?');
  if (queryIndex === -1) return null;
  const params = new URLSearchParams(hash.substring(queryIndex + 1));
  return params.get('status');
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
  const [agent, setAgent] = useState<AgentRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreatingSession, setIsCreatingSession] = useState<boolean>(false);
  const [activationState, setActivationState] = useState<ActivationState>('pending');
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dashboardBaseUrl =
    (import.meta.env.VITE_DASHBOARD_BASE_URL as string | undefined) ||
    'https://aiyouagent.com';
  const dashboardUrl = useMemo(
    () => `${dashboardBaseUrl.replace(/\/$/, '')}/dashboard/${slug}`,
    [dashboardBaseUrl, slug]
  );

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

  useEffect(() => {
    const statusParam = parseStatusParam();
    if (statusParam === 'success') {
      startActivationPolling();
    }
    if (statusParam === 'cancelled') {
      setActivationState('cancelled');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const startActivationPolling = () => {
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
  };

  const handleCheckout = async (provider?: 'stripe' | 'paypal') => {
    setError(null);
    setIsCreatingSession(true);
    try {
      const session = await agentOnboardingService.createCheckoutSession({
        slug,
        provider
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

  const isActive = activationState === 'active';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-10">
          <button type="button" onClick={onBackToSignup} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary-500 transition">
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back to signup
          </button>
          <Logo className="w-12 h-12" />
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
                    </ul>
                  </div>

                  <div className="p-5 border border-slate-200 rounded-xl">
                    <h2 className="font-semibold text-slate-800">Secure payment</h2>
                    <p className="text-sm text-slate-600 mt-2">
                      Choose the processor that works best for you. You&apos;ll be redirected to a secure hosted checkout page.
                    </p>
                    <div className="mt-6 space-y-3">
                      <button
                        type="button"
                        onClick={() => handleCheckout('stripe')}
                        disabled={isCreatingSession}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-slate-300 text-sm font-semibold transition ${isCreatingSession ? 'opacity-70 cursor-not-allowed' : 'hover:border-indigo-500 hover:text-indigo-600'}`}
                      >
                        <span className="material-symbols-outlined text-base">credit_card</span>
                        {isCreatingSession ? 'Opening checkout...' : 'Pay with Stripe'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCheckout('paypal')}
                        disabled={isCreatingSession}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-slate-300 text-sm font-semibold transition ${isCreatingSession ? 'opacity-70 cursor-not-allowed' : 'hover:border-indigo-500 hover:text-indigo-600'}`}
                      >
                        <span className="material-symbols-outlined text-base">account_balance</span>
                        {isCreatingSession ? 'Opening checkout...' : 'Pay with PayPal'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCheckout(undefined)}
                        disabled={isCreatingSession}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-indigo-600 text-white text-sm font-semibold shadow ${isCreatingSession ? 'opacity-70 cursor-not-allowed' : 'hover:bg-indigo-500'}`}
                      >
                        <span className="material-symbols-outlined text-base">auto_mode</span>
                        {isCreatingSession ? 'Opening checkout...' : 'Use recommended provider'}
                      </button>
                    </div>
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
                            onClick={() => window.location.hash = 'dashboard'}
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
      </div>
    </div>
  );
};

export default CheckoutPage;
