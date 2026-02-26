import React, { useEffect, useMemo, useState } from 'react';
import { agentOnboardingService, AgentRecord } from '../services/agentOnboardingService';
import LoadingSpinner from './LoadingSpinner';
import { Logo } from './Logo';
import { StripeLogo } from './StripeLogo';

interface CheckoutPageProps {
  slug: string;
  onBackToSignup: () => void;
}

type ActivationState = 'pending' | 'activating' | 'active' | 'cancelled';

const parseStatusParam = (): string | null => {
  const params = new URLSearchParams(window.location.search);
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
  const [promoCode, setPromoCode] = useState('');

  const handleApplyPromo = async () => {
    setError(null);
    setIsCreatingSession(true);
    try {
      const session = await agentOnboardingService.createCheckoutSession({
        slug,
        promoCode: promoCode.trim().toUpperCase()
      });
      if (session?.url) {
        window.location.href = session.url;
      } else {
        setError('Promo code applied but no redirect URL returned.');
      }
    } catch (err: unknown) {
      console.error('[CheckoutPage] Failed to apply promo code', err);
      setError(extractErrorMessage(err, 'Invalid promo code or system error.'));
    } finally {
      setIsCreatingSession(false);
    }
  };

  const dashboardBaseUrl =
    (import.meta.env.VITE_DASHBOARD_BASE_URL as string | undefined) ||
    'https://homelistingai.com';
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

  const handleCheckout = async (provider: string = 'stripe') => {
    setError(null);
    setIsCreatingSession(true);
    try {
      const session = await agentOnboardingService.createCheckoutSession({
        slug,
        provider,
        promoCode: promoCode.trim().toUpperCase() || undefined
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
    <div className="min-h-screen bg-[#02050D] font-sans relative overflow-hidden text-white">
      {/* Ambient Background Glows */}
      <div className="fixed top-0 left-1/2 w-[800px] h-[400px] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>

      <div className="max-w-4xl mx-auto px-6 py-10 relative z-10">
        <div className="flex items-center justify-between mb-10">
          <button type="button" onClick={onBackToSignup} className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-cyan-400 transition-colors">
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back to signup
          </button>
          <Logo className="w-12 h-12" />
        </div>

        <div className="bg-[#0B1121]/80 backdrop-blur-md rounded-3xl shadow-[0_0_40px_rgba(6,182,212,0.1)] border border-cyan-900/30 overflow-hidden">
          <div className="px-8 py-10 bg-gradient-to-r from-slate-900 to-[#02050D] border-b border-cyan-900/30">
            <p className="uppercase text-xs tracking-[0.2em] text-cyan-500 mb-2 font-bold">Agent Checkout</p>
            <h1 className="text-3xl font-extrabold tracking-tight">
              {agent ? `Secure your AI dashboard, ${agent.first_name}!` : 'Secure your AI dashboard'}
            </h1>
            <p className="text-sm text-slate-400 mt-3 max-w-2xl font-light">
              Complete payment to activate your AI Agent workspace. We will automatically generate your dashboard, preload funnels, and email your credentials the moment the payment clears.
            </p>
            <div className="mt-6 flex flex-wrap gap-4 text-xs uppercase tracking-wide">
              <span className="bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-full text-cyan-400 font-bold">Slug: {slug}</span>
              <span className="bg-slate-800 border border-slate-700 px-3 py-1 rounded-full text-slate-300 font-bold">
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
                  <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-xl text-sm text-red-400">
                    {error}
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="p-6 border border-slate-800/60 bg-[#0B1121]/50 backdrop-blur-sm rounded-2xl hover:border-cyan-900/50 transition-colors">
                    <h2 className="font-bold text-white tracking-tight">What happens after checkout</h2>
                    <ul className="mt-6 space-y-5 text-sm text-slate-400 font-light">
                      <li className="flex gap-4">
                        <span className="material-symbols-outlined text-cyan-400 text-xl flex-shrink-0">bolt</span>
                        <div>
                          <p className="font-bold text-slate-200 mb-1">Automatic activation</p>
                          <p className="leading-relaxed">Your dashboard and AI modules are provisioned instantly when the payment success webhook fires.</p>
                        </div>
                      </li>
                      <li className="flex gap-4">
                        <span className="material-symbols-outlined text-cyan-400 text-xl flex-shrink-0">mail</span>
                        <div>
                          <p className="font-bold text-slate-200 mb-1">Credentials sent securely</p>
                          <p className="leading-relaxed">We email a temporary Supabase password you can change after login.</p>
                        </div>
                      </li>
                      <li className="flex gap-4">
                        <span className="material-symbols-outlined text-cyan-400 text-xl flex-shrink-0">history</span>
                        <div>
                          <p className="font-bold text-slate-200 mb-1">Versioned templates</p>
                          <p className="leading-relaxed">Your funnels and message templates ship with defaults and 1-click revert history.</p>
                        </div>
                      </li>
                    </ul>
                  </div>

                  <div className="p-6 border border-slate-800/60 bg-[#0B1121]/50 backdrop-blur-sm rounded-2xl flex flex-col hover:border-cyan-900/50 transition-colors">
                    <h2 className="font-bold text-white tracking-tight">Secure Subscription</h2>
                    <p className="text-sm text-slate-400 mt-2 font-light">
                      You will be redirected to our secure checkout page to subscribe.
                    </p>
                    <div className="mt-8 flex-grow flex flex-col">
                      <button
                        type="button"
                        onClick={() => handleCheckout('stripe')}
                        disabled={isCreatingSession}
                        className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white text-slate-950 text-base font-bold shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] hover:bg-slate-200 transition-all ${isCreatingSession ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        <span className="material-symbols-outlined text-xl">rocket_launch</span>
                        {isCreatingSession ? 'Opening checkout...' : 'Start 3-Day Free Trial'}
                      </button>
                      <div className="mt-6 flex flex-col items-center justify-center gap-2 opacity-80">
                        <div className="flex items-center gap-2 text-slate-400">
                          <span className="material-symbols-outlined text-sm text-cyan-500">lock</span>
                          <span className="text-xs font-semibold uppercase tracking-wider">Payments secured by</span>
                          <StripeLogo className="h-4 text-slate-400 mb-0.5" />
                        </div>
                      </div>
                      <div className="mt-4 text-center">
                        <p className="text-sm font-bold text-white tracking-tight">3 days free, then $69/mo</p>
                        <p className="text-xs text-slate-400 mt-1 font-light">Cancel anytime before trial ends and you won't be charged.</p>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-6 text-center text-balance leading-tight px-4 font-light">
                        Prices subject to change without notice. Existing customers will receive a 30-day written notice of any price adjustments.
                      </p>
                      <div className="mt-6 p-4 bg-cyan-900/10 border border-cyan-500/20 rounded-xl flex items-start gap-4">
                        <span className="material-symbols-outlined text-cyan-400 text-2xl flex-shrink-0">verified_user</span>
                        <div>
                          <p className="text-sm font-bold text-white tracking-tight">30-Day Money-Back Guarantee</p>
                          <p className="text-xs text-slate-400 mt-1 font-light leading-relaxed">
                            Try HomeListingAI risk-free. If you're not completely satisfied within 30 days, we'll refund your payment in full.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Promo Code Section */}
                    <div className="mt-8 pt-6 border-t border-slate-800/60 mt-auto">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="material-symbols-outlined text-slate-500 text-sm">sell</span>
                        <span className="text-sm font-bold text-white tracking-tight uppercase">Have a promo code?</span>
                      </div>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          placeholder="Enter code"
                          className="flex-1 px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none text-white font-mono placeholder-slate-600 text-sm uppercase transition-colors"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={handleApplyPromo}
                          disabled={isCreatingSession || !promoCode.trim()}
                          className="px-6 py-3 text-sm font-bold text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {!isActive && (
                  <div className="p-6 bg-slate-800/20 border border-slate-700/50 rounded-2xl text-sm text-slate-300 flex items-center justify-between flex-wrap gap-4 mt-8">
                    <div className="flex items-center gap-4">
                      <span className="material-symbols-outlined text-2xl text-cyan-500 animate-spin-slow">loop</span>
                      <div>
                        <p className="font-bold text-white mb-1 tracking-tight">Waiting for payment confirmation</p>
                        <p className="font-light text-slate-400">Stay on this page after checkout. We will refresh once your payment is confirmed.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={startActivationPolling}
                      disabled={isPolling}
                      className={`px-6 py-3 text-sm font-bold rounded-xl border border-slate-700 hover:bg-slate-800 transition-colors ${isPolling ? 'opacity-70 cursor-not-allowed' : 'hover:border-slate-600 text-white'}`}
                    >
                      {isPolling ? 'Checking status...' : 'Check status now'}
                    </button>
                  </div>
                )}

                {isActive && (
                  <div className="p-6 bg-cyan-900/10 border border-cyan-500/30 rounded-2xl text-sm mt-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none"></div>
                    <div className="relative z-10 flex items-start gap-4">
                      <span className="material-symbols-outlined text-3xl text-cyan-400 flex-shrink-0">check_circle</span>
                      <div>
                        <p className="font-bold text-xl text-white tracking-tight mb-2">Payment confirmed!</p>
                        <p className="text-slate-300 font-light leading-relaxed">
                          Your dashboard is live and your welcome email is on the way. Use the button below to log in with the credentials we emailed.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-4">
                          <a
                            href={dashboardUrl}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-slate-950 font-bold shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] hover:bg-slate-200 transition-all"
                          >
                            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                            Open my dashboard
                          </a>
                          <button
                            type="button"
                            onClick={() => window.location.hash = 'dashboard'}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-cyan-500/30 text-cyan-400 font-bold hover:bg-cyan-900/20 hover:border-cyan-500/50 transition-all tracking-wide"
                          >
                            <span className="material-symbols-outlined text-[18px]">space_dashboard</span>
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
