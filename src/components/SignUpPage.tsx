import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { agentOnboardingService } from '../services/agentOnboardingService';
import { supabase } from '../services/supabase';
import { PENDING_PLAN_KEY } from './ComparePlansModal';
import { PublicHeader } from './layout/PublicHeader';
import { PublicFooter } from './layout/PublicFooter';
import { StripeLogo } from './StripeLogo';
import { BackgroundTechIcons } from './BackgroundTechIcons';

interface SignUpPageProps {
    onNavigateToSignIn: () => void;
    onNavigateToLanding: () => void;
    onNavigateToSection: (sectionId: string) => void;
    onEnterDemoMode: () => void;
}

const FeatureHighlight: React.FC<{ icon: string, title: string, children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="bg-[#0B1121]/50 backdrop-blur-sm p-4 rounded-xl border border-cyan-900/30 flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 bg-cyan-900/20 rounded-lg flex items-center justify-center border border-cyan-500/20">
            <span className="material-symbols-outlined w-6 h-6 text-cyan-400">{icon}</span>
        </div>
        <div>
            <h4 className="font-bold text-white tracking-tight">{title}</h4>
            <p className="text-sm text-slate-400 font-light mt-0.5">{children}</p>
        </div>
    </div>
);

const SignUpPage = ({ onNavigateToSignIn, onNavigateToLanding: _onNavigateToLanding, onNavigateToSection: _onNavigateToSection, onEnterDemoMode }: SignUpPageProps): JSX.Element => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState<React.ReactNode>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);

    const handleGoogleSignUp = async () => {
        setIsGoogleLoading(true);
        try {
            await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: `${window.location.origin}/dashboard/today` }
            });
        } catch {
            setError('Google sign-up failed. Please try again.');
            setIsGoogleLoading(false);
        }
    };

    // Preserve plan intent from ?plan= so the dashboard can auto-start upgrade
    const planParam = searchParams.get('plan');
    const pendingPlan = planParam === 'starter' || planParam === 'pro' ? planParam : null;

    // Loan-officer signup: /signup?type=lo (or ?plan=lo / ?plan=lo_pro) → send to the
    // dedicated LO flow, which collects NMLS + phone and starts the LO plan checkout.
    const isLo = searchParams.get('type') === 'lo' || planParam === 'lo' || planParam === 'lo_pro';
    useEffect(() => {
        if (isLo) navigate('/lo-signup', { replace: true });
    }, [isLo, navigate]);

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!firstName || !lastName || !email) {
            setError('Please fill in all fields');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Please enter a valid email address');
            return;
        }

        setIsSubmitting(true);

        // Store plan intent before navigating away
        if (pendingPlan) {
            try { sessionStorage.setItem(PENDING_PLAN_KEY, pendingPlan); } catch (_) { /* ignore */ }
        }

        try {
            const data = await agentOnboardingService.registerAgent({
                firstName,
                lastName,
                email: email.trim().toLowerCase()
            });

            const tempPassword = data.credentials?.password;
            if (!tempPassword) {
                throw new Error('Your account was created, but auto-login failed. Please check your email for login details.');
            }

            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: email.trim().toLowerCase(),
                password: tempPassword
            });

            if (signInError) {
                throw signInError;
            }

            navigate('/dashboard/today', { replace: true });
        } catch (error) {
            console.error('Signup error:', error);
            const message = error instanceof Error ? error.message : 'An error occurred during sign up. Please try again.';
            if (message.toLowerCase().includes('duplicate') || message.toLowerCase().includes('already')) {
                setError(
                    <span>
                        Account already exists. <button type="button" onClick={onNavigateToSignIn} className="font-semibold text-cyan-400 hover:underline focus:outline-none">Sign in</button> or reset your password.
                    </span>
                );
            } else {
                setError(message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#02050D] font-sans flex flex-col relative overflow-hidden text-white">

            <PublicHeader
                onNavigateToSignUp={() => { }}
                onNavigateToSignIn={onNavigateToSignIn}
                onEnterDemoMode={onEnterDemoMode}
            />

            {/* Ambient Background Glows */}
            <BackgroundTechIcons />
            <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none translate-x-1/2"></div>
            <div className="absolute bottom-1/4 left-0 w-[600px] h-[600px] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none -translate-x-1/2"></div>

            <main className="flex-grow pt-24 pb-12 sm:pt-32 sm:pb-20 relative z-10">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
                        {/* Left Column */}
                        <div className="space-y-8 lg:sticky lg:top-32">
                            <div className="flex items-center gap-3">
                                <div>
                                    <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Level Up Your Business</h1>
                                    <p className="text-cyan-400 font-semibold tracking-wide text-sm uppercase mt-2">Real free plan • Dashboard in under 30 seconds</p>
                                </div>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-5">
                                <FeatureHighlight icon="group" title="Generate Real Leads">See actual prospects contact you within days</FeatureHighlight>
                                <FeatureHighlight icon="schedule" title="24/7 Lead Capture">AI works while you sleep - never miss a lead</FeatureHighlight>
                                <FeatureHighlight icon="trending_up" title="Higher Conversion">Turn 3x more visitors into qualified leads</FeatureHighlight>
                                <FeatureHighlight icon="payments" title="Instant ROI">One sale pays for years of service</FeatureHighlight>
                            </div>

                            <div className="p-6 bg-cyan-900/20 text-cyan-50 border border-cyan-500/20 rounded-xl">
                                <div className="flex items-start gap-4">
                                    <span className="material-symbols-outlined w-8 h-8 text-cyan-400 flex-shrink-0">verified_user</span>
                                    <div>
                                        <h3 className="font-bold text-lg text-white">Your Data Stays Private</h3>
                                        <p className="text-sm mt-2 text-slate-300 font-light leading-relaxed">Your privacy is respected. This is your real free account, not a timed trial. All information is secure and you can upgrade any time from Settings → Billing.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap justify-between gap-y-4 text-sm text-slate-400 font-medium pt-6 mb-4 border-t border-slate-800">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined w-4 h-4 text-cyan-500">check</span>
                                    <span className="flex items-center gap-1">Secure via <StripeLogo className="h-4 opacity-70 mb-0.5 ml-1" /></span>
                                </div>
                                <div className="flex items-center gap-2"><span className="material-symbols-outlined w-4 h-4 text-cyan-500">check</span> Cancel anytime</div>
                                <div className="flex items-center gap-2"><span className="material-symbols-outlined w-4 h-4 text-cyan-500">check</span> 30-Day Money-Back Guarantee</div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="bg-[#0B1121]/80 backdrop-blur-md p-8 sm:p-10 rounded-3xl shadow-[0_0_40px_rgba(6,182,212,0.1)] border border-cyan-900/30">
                            {/* Plan intent banner — shown when user clicked a paid plan CTA */}
                            {pendingPlan && (
                                <div className="mb-6 flex items-center gap-3 rounded-xl bg-primary-600/10 border border-primary-500/30 px-4 py-3">
                                    <span className="material-symbols-outlined text-primary-400 text-lg shrink-0">workspace_premium</span>
                                    <p className="text-sm text-primary-200">
                                        You're signing up for{' '}
                                        <span className="font-bold text-white capitalize">{pendingPlan}</span>
                                        {' '}— create your account first, then we'll set up your plan.
                                    </p>
                                </div>
                            )}
                            <h2 className="text-2xl font-bold text-white tracking-tight">Create Free Account</h2>
                            <p className="text-sm text-slate-400 mt-1 font-light">Get your dashboard instantly. Upgrade later only if you want to.</p>

                            <form className="mt-8 space-y-6" onSubmit={handleSignUp}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="first-name" className="block text-sm font-semibold text-slate-300 mb-2">First Name</label>
                                        <input type="text" id="first-name" value={firstName} onChange={e => setFirstName(e.target.value)} required className="w-full px-4 py-3.5 bg-white/5 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-light" placeholder="Jane" />
                                    </div>
                                    <div>
                                        <label htmlFor="last-name" className="block text-sm font-semibold text-slate-300 mb-2">Last Name</label>
                                        <input type="text" id="last-name" value={lastName} onChange={e => setLastName(e.target.value)} required className="w-full px-4 py-3.5 bg-white/5 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-light" placeholder="Doe" />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="email-address" className="block text-sm font-semibold text-slate-300 mb-2">Email Address</label>
                                    <input type="email" id="email-address" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-4 py-3.5 bg-white/5 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-light" placeholder="jane@example.com" />
                                </div>

                                {error && (
                                    <div className="p-4 bg-red-900/20 text-red-400 border border-red-900/50 rounded-xl text-sm" role="alert">
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <button type="submit" disabled={isSubmitting} className={`w-full flex justify-center items-center px-4 py-4 text-base font-bold text-slate-950 bg-white rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:bg-slate-200 hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] transition-all ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}>
                                        {isSubmitting ? (
                                            <>
                                                <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
                                                Creating your dashboard...
                                            </>
                                        ) : (
                                            'Create Free Account'
                                        )}
                                    </button>
                                    {isSubmitting && (
                                        <div className="mt-4 text-center animate-pulse">
                                            <p className="text-sm text-slate-400 font-light">Signing you in...</p>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-px bg-slate-700" />
                                        <span className="text-xs text-slate-500">or</span>
                                        <div className="flex-1 h-px bg-slate-700" />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleGoogleSignUp}
                                        disabled={isGoogleLoading}
                                        className={`w-full flex justify-center items-center gap-3 px-4 py-3.5 text-sm font-semibold text-white bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700 transition-all ${isGoogleLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/></svg>
                                        {isGoogleLoading ? 'Redirecting...' : 'Continue with Google'}
                                    </button>
                                </div>
                            </form>

                            <p className="text-center text-sm text-slate-500 mt-8 font-medium">
                                Already have an account?{' '}
                                <button onClick={onNavigateToSignIn} className="font-bold text-white hover:text-cyan-400 transition-colors ml-1">
                                    Sign in here
                                </button>
                            </p>

                            <p className="text-center text-[10px] text-slate-600 mt-6 max-w-xs mx-auto">
                                By proceeding, you agree to our Terms of Service and Privacy Policy. HomeListingAI provides marketing automations and is not a broker.
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            <div className="mt-auto relative z-10">
                <PublicFooter onNavigateToAdmin={() => window.location.href = '/admin'} />
            </div>
        </div>
    );
};

export default SignUpPage;
