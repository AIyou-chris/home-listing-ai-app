import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { agentOnboardingService } from '../services/agentOnboardingService';
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

const SignUpPage = ({ onNavigateToSignIn, onNavigateToLanding, onNavigateToSection, onEnterDemoMode }: SignUpPageProps): JSX.Element => {
    const navigate = useNavigate();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState<React.ReactNode>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

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

        try {
            const data = await agentOnboardingService.registerAgent({
                firstName,
                lastName,
                email: email.trim().toLowerCase()
            });

            const { checkoutUrl, slug } = data;

            if (checkoutUrl) {
                navigate(checkoutUrl);
            } else {
                navigate(`/checkout/${slug}`);
            }
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
                                    <p className="text-cyan-400 font-semibold tracking-wide text-sm uppercase mt-2">No commitment • Capture leads instantly</p>
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
                                        <h3 className="font-bold text-lg text-white">Temporary Trial Data</h3>
                                        <p className="text-sm mt-2 text-slate-300 font-light leading-relaxed">Your privacy is respected. This trial account is temporary. All information is secure and you can delete your account easily at any time.</p>
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
                            <h2 className="text-2xl font-bold text-white tracking-tight">Start Free Trial</h2>
                            <p className="text-sm text-slate-400 mt-1 font-light">Get started in less than 30 seconds</p>

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

                                <div>
                                    <button type="submit" disabled={isSubmitting} className={`w-full flex justify-center items-center px-4 py-4 text-base font-bold text-slate-950 bg-white rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:bg-slate-200 hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] transition-all ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}>
                                        {isSubmitting ? (
                                            <>
                                                <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
                                                Preparing account...
                                            </>
                                        ) : (
                                            'Create Free Account'
                                        )}
                                    </button>
                                    {isSubmitting && (
                                        <div className="mt-4 text-center animate-pulse">
                                            <p className="text-sm text-slate-400 font-light">Redirecting securely...</p>
                                        </div>
                                    )}
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
