
import React, { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../services/firebase';
import { AuthHeader } from './AuthHeader';
import { AuthFooter } from './AuthFooter';
import { Logo } from './Logo';

interface SignUpPageProps {
    onNavigateToSignIn: () => void;
    onNavigateToLanding: () => void;
    onNavigateToSection: (sectionId: string) => void;
    onEnterDemoMode: () => void;
}

const FeatureHighlight: React.FC<{ icon: string, title: string, children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200/60 flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined w-6 h-6 text-slate-500">{icon}</span>
        </div>
        <div>
            <h4 className="font-bold text-slate-800">{title}</h4>
            <p className="text-sm text-slate-500">{children}</p>
        </div>
    </div>
);

const SignUpPage: React.FC<SignUpPageProps> = ({ onNavigateToSignIn, onNavigateToLanding, onNavigateToSection, onEnterDemoMode }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [error, setError] = useState<React.ReactNode>('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!auth.currentUser) {
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                // After user is created, update their profile with the full name
                await updateProfile(userCredential.user, {
                    displayName: fullName,
                });

                // Trigger onboarding sequence
                try {
                    const triggerOnboardingSequence = httpsCallable(functions, 'triggerOnboardingSequence');
                    await triggerOnboardingSequence({
                        userEmail: email,
                        userName: fullName
                    });
                    console.log('Onboarding sequence triggered successfully');
                } catch (onboardingError) {
                    console.error('Failed to trigger onboarding sequence:', onboardingError);
                    // Don't fail the signup if onboarding fails
                }

                // App.tsx's onAuthStateChanged will handle navigation
            } catch (err: any) {
                if (err.code === 'auth/email-already-in-use') {
                    setError(
                        <span>
                            This email address is already in use. Please{' '}
                            <button type="button" onClick={onNavigateToSignIn} className="font-semibold text-primary-600 hover:underline focus:outline-none">
                                sign in
                            </button>
                            {' '}or use a different email.
                        </span>
                    );
                } else {
                    console.error("Firebase SignUp Error:", err);
                    setError('Sign-up failed. Please check your details and try again.');
                }
            }
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <AuthHeader onNavigateToSignUp={() => {}} onNavigateToSignIn={onNavigateToSignIn} onNavigateToLanding={onNavigateToLanding} onNavigateToSection={onNavigateToSection} onEnterDemoMode={onEnterDemoMode} />
            <main className="py-12 sm:py-20">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
                        {/* Left Column */}
                        <div className="space-y-8">
                            <div className="flex items-center gap-3">
                                <button type="button" onClick={onNavigateToLanding} className="p-1 -ml-1 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500">
                                    <Logo className="w-10 h-10" />
                                </button>
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Start Your Free Trial</h1>
                                    <p className="text-slate-500 font-semibold">No commitment • No data stored</p>
                                </div>
                            </div>

                            <div className="p-5 bg-green-50 text-green-800 border-l-4 border-green-400 rounded-r-lg">
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined w-6 h-6 text-green-500 flex-shrink-0">verified_user</span>
                                    <div>
                                        <h3 className="font-bold">Privacy First - Your Data is Safe</h3>
                                        <p className="text-sm mt-1">We take your privacy seriously. This trial account is completely temporary. All your information, including name, email, and any data you create during the trial, will be automatically deleted after 7 days or when you end the trial. We don't keep anything. Feel free to explore and play around!</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="grid sm:grid-cols-2 gap-5">
                                <FeatureHighlight icon="group" title="Generate Real Leads">See actual prospects contact you within days</FeatureHighlight>
                                <FeatureHighlight icon="schedule" title="24/7 Lead Capture">AI works while you sleep - never miss a lead</FeatureHighlight>
                                <FeatureHighlight icon="trending_up" title="Higher Conversion">Turn 3x more visitors into qualified leads</FeatureHighlight>
                                <FeatureHighlight icon="payments" title="Instant ROI">One sale pays for years of service</FeatureHighlight>
                            </div>
                            
                            <div className="flex justify-around text-sm text-slate-500 font-medium pt-5 border-t border-slate-200">
                                <div className="flex items-center gap-2"><span className="material-symbols-outlined w-4 h-4 text-green-500">check</span> No credit card required</div>
                                <div className="flex items-center gap-2"><span className="material-symbols-outlined w-4 h-4 text-green-500">check</span> Cancel anytime</div>
                                <div className="flex items-center gap-2"><span className="material-symbols-outlined w-4 h-4 text-green-500">check</span> Auto-delete after 7 days</div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-slate-200/70">
                            <h2 className="text-xl font-bold text-slate-800">Create Your Trial Account</h2>
                            <p className="text-sm text-slate-500 mt-1">Get started in less than 30 seconds</p>

                            <form className="mt-8 space-y-6" onSubmit={handleSignUp}>
                                <div>
                                    <label htmlFor="full-name" className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
                                    <input type="text" id="full-name" value={fullName} onChange={e => setFullName(e.target.value)} required className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition" placeholder="Enter your full name" />
                                </div>
                                <div>
                                    <label htmlFor="email-address" className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
                                    <input type="email" id="email-address" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition" placeholder="Enter your email" />
                                </div>
                                <div>
                                    <label htmlFor="password"  className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
                                    <div className="relative">
                                        <input type={isPasswordVisible ? "text" : "password"} id="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition" />
                                        <button type="button" onClick={() => setIsPasswordVisible(!isPasswordVisible)} className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-500 hover:text-primary-600">
                                            <span className="material-symbols-outlined w-5 h-5">{isPasswordVisible ? 'visibility_off' : 'visibility'}</span>
                                        </button>
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-lg text-sm" role="alert">
                                        {error}
                                    </div>
                                )}
                                
                                <div className="p-4 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg">
                                    <div className="flex items-start gap-3">
                                        <span className="material-symbols-outlined w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5">info</span>
                                        <div>
                                            <h4 className="font-semibold">Temporary Account Notice</h4>
                                            <p className="text-xs mt-1">This trial account and all data will be automatically deleted after 7 days. Perfect for testing without any long-term commitment!</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg">
                                    <div className="flex items-start gap-3">
                                        <span className="material-symbols-outlined w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5">gavel</span>
                                        <div>
                                            <h4 className="font-semibold">Important Legal Notice</h4>
                                            <p className="text-xs mt-1">HomeListingAI provides tools and functionality only. You are responsible for all marketing content, communications, and compliance with real estate laws and regulations. Please review our Terms of Service and Privacy Policy.</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <button type="submit" className="w-full flex justify-center items-center px-4 py-3.5 text-base font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                                        → Start Free Trial
                                    </button>
                                </div>
                            </form>
                            
                            <p className="text-center text-sm text-slate-600 mt-8">
                                Already have an account?{' '}
                                <button onClick={onNavigateToSignIn} className="font-semibold text-primary-600 hover:text-primary-500">
                                    Sign in here
                                </button>
                            </p>
                        </div>
                    </div>
                </div>
            </main>
            <AuthFooter />
        </div>
    );
};

export default SignUpPage;