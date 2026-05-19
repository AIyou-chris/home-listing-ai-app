import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { agentOnboardingService } from '../services/agentOnboardingService';
import { supabase } from '../services/supabase';
import { PublicHeader } from './layout/PublicHeader';
import { PublicFooter } from './layout/PublicFooter';
import { BackgroundTechIcons } from './BackgroundTechIcons';

type Plan = 'lo' | 'lo_pro';

const PLANS: Record<Plan, { name: string; price: string; tagline: string; features: string[]; highlight: boolean }> = {
    lo: {
        name: 'LO',
        price: '$149',
        tagline: 'Build your agent network and fill your pipeline.',
        highlight: false,
        features: [
            '20 active listings across your partner network',
            'AI buyer chatbot on every listing page',
            'Co-branded with your name + NMLS #',
            'Warm lead alerts to you + your partner',
            'Preapproval request capture built in',
            'Lead inbox + activity timeline',
            '250 SMS / month included',
        ],
    },
    lo_pro: {
        name: 'LO Pro',
        price: '$299',
        tagline: 'High-volume LOs running a serious agent network.',
        highlight: true,
        features: [
            '50 active listings across your partner network',
            'Everything in LO — all features included',
            'Unlimited SMS / month',
            'Priority lead routing',
            'Advanced analytics dashboard',
            'Multiple agent partnerships',
            'Co-branded assets with your LO branding',
        ],
    },
};

const LOSignupPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const planParam = searchParams.get('plan');
    const initialPlan: Plan = planParam === 'lo_pro' ? 'lo_pro' : 'lo';

    const [selectedPlan, setSelectedPlan] = useState<Plan>(initialPlan);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [nmls, setNmls] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!firstName || !lastName || !email || !password || !nmls) {
            setError('Please fill in all required fields.');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Please enter a valid email address.');
            return;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }

        setIsSubmitting(true);

        try {
            // 1. Register the agent with account_type = 'lo'
            const data = await agentOnboardingService.registerAgent({
                firstName,
                lastName,
                email: email.trim().toLowerCase(),
                accountType: 'lo',
                phone,
                nmls,
            });

            // 2. Sign them in using Supabase with the temp password from registration,
            //    then immediately update to their chosen password
            const tempPassword = data.credentials?.password;
            if (!tempPassword) {
                throw new Error('Account created but auto-login failed. Check your email for login details.');
            }

            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: email.trim().toLowerCase(),
                password: tempPassword,
            });
            if (signInError) throw signInError;

            // Update to their chosen password
            await supabase.auth.updateUser({ password });

            // 3. Create checkout session with the selected plan
            const session = await agentOnboardingService.createCheckoutSession({
                slug: data.slug,
                plan: selectedPlan,
            });

            if (!session?.url) {
                // If checkout can't be created yet (no price IDs), go to dashboard
                navigate('/dashboard/lo-listings', { replace: true });
                return;
            }

            window.location.replace(session.url);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
            if (msg.toLowerCase().includes('already exists') || msg.toLowerCase().includes('duplicate')) {
                setError('An account with this email already exists. Sign in instead.');
            } else {
                setError(msg);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#02050D] font-sans flex flex-col text-white relative overflow-hidden">
            <PublicHeader
                onNavigateToSignUp={() => { }}
                onNavigateToSignIn={() => navigate('/signin')}
                onEnterDemoMode={() => { }}
            />

            <BackgroundTechIcons />
            <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none translate-x-1/2" />
            <div className="absolute bottom-1/4 left-0 w-[600px] h-[600px] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none -translate-x-1/2" />

            <main className="flex-1 flex flex-col items-center justify-start py-16 px-4 relative z-10">

                {/* Header */}
                <div className="text-center mb-10 max-w-xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-800/40 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-4">
                        <span className="material-symbols-outlined text-sm">verified</span>
                        For Loan Officers
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
                        Start your 3-day free trial
                    </h1>
                    <p className="text-slate-400 text-base">
                        No charge for 3 days. Cancel anytime. Your card is only saved — not charged — until day 3.
                    </p>
                </div>

                {/* Plan Picker */}
                <div className="w-full max-w-2xl mb-8">
                    <p className="text-sm text-slate-400 text-center mb-4 uppercase tracking-widest font-semibold">Choose your plan</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {(Object.entries(PLANS) as [Plan, typeof PLANS[Plan]][]).map(([key, plan]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setSelectedPlan(key)}
                                className={`relative text-left rounded-2xl p-6 border-2 transition-all focus:outline-none ${
                                    selectedPlan === key
                                        ? 'border-cyan-500 bg-cyan-950/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                                        : 'border-slate-700 bg-[#0B1121]/60 hover:border-slate-500'
                                }`}
                            >
                                {plan.highlight && (
                                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-[#02050D] text-xs font-bold uppercase tracking-wider py-0.5 px-3 rounded-full">
                                        Most Popular
                                    </span>
                                )}
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <p className="text-white font-bold text-lg">{plan.name}</p>
                                        <p className="text-slate-400 text-xs mt-0.5">{plan.tagline}</p>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                                        selectedPlan === key ? 'border-cyan-500 bg-cyan-500' : 'border-slate-600'
                                    }`}>
                                        {selectedPlan === key && (
                                            <span className="material-symbols-outlined text-[#02050D] text-[12px] font-bold">check</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-baseline gap-1 mb-4">
                                    <span className="text-3xl font-extrabold text-white">{plan.price}</span>
                                    <span className="text-slate-400 text-sm">/ month</span>
                                </div>
                                <ul className="space-y-2">
                                    {plan.features.slice(0, 4).map((f, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                            <span className="material-symbols-outlined text-cyan-500 text-base shrink-0 mt-0.5">check</span>
                                            {f}
                                        </li>
                                    ))}
                                    {plan.features.length > 4 && (
                                        <li className="text-xs text-slate-500 pl-6">+ {plan.features.length - 4} more features</li>
                                    )}
                                </ul>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sign Up Form */}
                <div className="w-full max-w-md">
                    <div className="bg-[#0B1121]/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
                        <h2 className="text-lg font-bold text-white mb-6">Create your account</h2>

                        {error && (
                            <div className="mb-5 p-3 rounded-lg bg-red-950/40 border border-red-800/40 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">First Name <span className="text-red-400">*</span></label>
                                    <input
                                        type="text"
                                        value={firstName}
                                        onChange={e => setFirstName(e.target.value)}
                                        className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                                        placeholder="Chris"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Last Name <span className="text-red-400">*</span></label>
                                    <input
                                        type="text"
                                        value={lastName}
                                        onChange={e => setLastName(e.target.value)}
                                        className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                                        placeholder="Johnson"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Email <span className="text-red-400">*</span></label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                                    Password <span className="text-red-400">*</span>
                                    <span className="text-slate-500 normal-case font-normal ml-1">(min 8 characters)</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors pr-10"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(s => !s)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">NMLS # <span className="text-red-400">*</span></label>
                                    <input
                                        type="text"
                                        value={nmls}
                                        onChange={e => setNmls(e.target.value)}
                                        className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                                        placeholder="1234567"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Phone</label>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                                        placeholder="(949) 555-0100"
                                    />
                                </div>
                            </div>

                            {/* Selected plan summary */}
                            <div className="flex items-center justify-between bg-cyan-950/30 border border-cyan-800/30 rounded-lg px-4 py-3">
                                <div>
                                    <p className="text-sm font-semibold text-white">{PLANS[selectedPlan].name} Plan</p>
                                    <p className="text-xs text-slate-400">3-day free trial, then {PLANS[selectedPlan].price}/mo</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => document.getElementById('lo-plan-picker')?.scrollIntoView({ behavior: 'smooth' })}
                                    className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                                >
                                    Change
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-800 disabled:cursor-not-allowed text-[#02050D] font-bold rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Creating your account...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-lg">rocket_launch</span>
                                        Start 3-Day Free Trial — {PLANS[selectedPlan].price}/mo after
                                    </>
                                )}
                            </button>

                            <p className="text-center text-xs text-slate-500">
                                By signing up you agree to our{' '}
                                <a href="/terms" className="text-slate-400 hover:text-white underline">Terms</a> and{' '}
                                <a href="/privacy" className="text-slate-400 hover:text-white underline">Privacy Policy</a>.
                                No charge for 3 days.
                            </p>
                        </form>

                        <div className="mt-6 pt-6 border-t border-slate-700/50 text-center">
                            <p className="text-sm text-slate-400">
                                Already have an account?{' '}
                                <button onClick={() => navigate('/signin')} className="text-cyan-400 font-semibold hover:text-cyan-300 transition-colors">
                                    Sign in
                                </button>
                            </p>
                        </div>
                    </div>

                    {/* Trust badges */}
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
                        {['NMLS # on All Assets', 'TCPA Compliant SMS', 'Data Encrypted at Rest'].map(badge => (
                            <div key={badge} className="flex items-center gap-1.5 text-xs text-slate-500">
                                <span className="material-symbols-outlined text-sm text-slate-600">verified_user</span>
                                {badge}
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            <PublicFooter />
        </div>
    );
};

export default LOSignupPage;
