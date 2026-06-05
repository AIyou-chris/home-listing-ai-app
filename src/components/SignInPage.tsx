import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { PublicHeader } from './layout/PublicHeader';
import { PublicFooter } from './layout/PublicFooter';
import { BackgroundTechIcons } from './BackgroundTechIcons';
import { useTenantBrand } from '../hooks/useTenantBrand';

interface SignInPageProps {
    onNavigateToSignUp: () => void;
    onNavigateToLanding: () => void;
    onNavigateToSection: (sectionId: string) => void;
    onEnterDemoMode: () => void;
    onNavigateToAdmin?: () => void;
}

const SignInPage: React.FC<SignInPageProps> = ({ onNavigateToSignUp, onNavigateToLanding: _onNavigateToLanding, onEnterDemoMode, onNavigateToAdmin }) => {
    const navigate = useNavigate();
    const tenantBrand = useTenantBrand();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);

    const handleGoogleSignIn = async () => {
        setIsGoogleLoading(true);
        try {
            await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: `${window.location.origin}/dashboard/today` }
            });
        } catch (err) {
            setError('Google sign-in failed. Please try again.');
            setIsGoogleLoading(false);
        }
    };

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Demo shortcut — skip Supabase entirely and enter demo mode
        if (email.trim().toLowerCase() === 'demo@homelistingai.com') {
            onEnterDemoMode();
            return;
        }

        setIsLoading(true);
        console.log('🚀 Attempting Sign In for:', email);

        try {
            console.log('⏳ calling signInWithPassword...');
            const signInPromise = supabase.auth.signInWithPassword({
                email: email.trim().toLowerCase(),
                password
            });

            const timeoutPromise = new Promise<{ error: any; data?: any }>((_, reject) => // eslint-disable-line @typescript-eslint/no-explicit-any
                setTimeout(() => reject(new Error('Sign-in timed out. Please check your connection and try again.')), 30000)
            );

            // Force cast to any to handle the race result mixture
            const result = await Promise.race([signInPromise, timeoutPromise]) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

            if (result.error) {
                console.error('❌ Sign In Error:', result.error);
                throw result.error;
            }

            navigate('/dashboard/today', { replace: true });

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'An unexpected error occurred';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#02050D] font-sans flex flex-col relative overflow-hidden text-white">

            <PublicHeader
                onNavigateToSignUp={onNavigateToSignUp}
                onNavigateToSignIn={() => { }}
                onEnterDemoMode={onEnterDemoMode}
            />

            {/* Ambient Background Glows */}
            <BackgroundTechIcons />
            <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none -translate-x-1/2"></div>
            <div className="absolute bottom-1/4 right-0 w-[600px] h-[600px] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none translate-x-1/2"></div>

            <main className="flex-grow flex items-center justify-center py-24 sm:py-32 relative z-10">
                <div className="w-full max-w-md px-4 sm:px-0">
                    <div className="bg-[#0B1121]/80 backdrop-blur-md p-8 sm:p-10 rounded-3xl shadow-[0_0_40px_rgba(6,182,212,0.1)] border border-cyan-900/30">
                        <div className="text-center mb-8">
                            {tenantBrand && (
                                <div className="flex flex-col items-center gap-2 mb-4">
                                    {tenantBrand.logoUrl ? (
                                        <img src={tenantBrand.logoUrl} alt={tenantBrand.companyName || 'Logo'} className="h-10 max-w-[180px] object-contain" />
                                    ) : (
                                        <div className="h-10 w-10 rounded-full flex items-center justify-center text-white font-black text-lg"
                                            style={{ background: tenantBrand.brandColor }}>
                                            {(tenantBrand.companyName || 'O')[0].toUpperCase()}
                                        </div>
                                    )}
                                    {tenantBrand.companyName && (
                                        <span className="text-sm font-semibold text-slate-300">{tenantBrand.companyName}</span>
                                    )}
                                </div>
                            )}
                            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                                Sign In{tenantBrand?.companyName ? ` to ${tenantBrand.companyName}` : ' to HomeListingAI'}
                            </h1>
                            <p className="text-slate-400 mt-3 font-light">Welcome back! Please enter your details.</p>
                        </div>

                        {error && (
                            <div className="p-4 mb-6 bg-red-900/20 text-red-400 border border-red-900/50 rounded-xl text-sm" role="alert">
                                {error}
                            </div>
                        )}

                        <form className="space-y-6" onSubmit={handleSignIn}>
                            <div>
                                <label htmlFor="email-address" className="block text-sm font-semibold text-slate-300 mb-2">Email Address</label>
                                <input
                                    type="email"
                                    id="email-address"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full px-4 py-3.5 bg-white/5 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-light"
                                    placeholder="you@example.com"
                                />
                            </div>
                            <div>
                                <div className="flex justify-between items-baseline mb-2">
                                    <label htmlFor="password" className="block text-sm font-semibold text-slate-300">Password</label>
                                    <button type="button" onClick={() => navigate('/forgot-password')} className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">Forgot password?</button>
                                </div>
                                <div className="relative">
                                    <input
                                        type={isPasswordVisible ? "text" : "password"}
                                        id="password"
                                        autoComplete="current-password"
                                        required
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full px-4 py-3.5 bg-white/5 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-light"
                                    />
                                    <button type="button" onClick={() => setIsPasswordVisible(!isPasswordVisible)} className="absolute inset-y-0 right-0 px-4 flex items-center text-slate-400 hover:text-cyan-400 transition-colors">
                                        <span className="material-symbols-outlined w-5 h-5">{isPasswordVisible ? 'visibility_off' : 'visibility'}</span>
                                    </button>
                                </div>
                            </div>

                            <div className="pt-2 space-y-3">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className={`w-full flex justify-center items-center px-4 py-4 text-base font-bold text-slate-950 bg-white rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:bg-slate-200 hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] transition-all ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {isLoading ? 'Signing In...' : 'Sign In'}
                                </button>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-px bg-slate-700" />
                                    <span className="text-xs text-slate-500">or</span>
                                    <div className="flex-1 h-px bg-slate-700" />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleGoogleSignIn}
                                    disabled={isGoogleLoading}
                                    className={`w-full flex justify-center items-center gap-3 px-4 py-3.5 text-sm font-semibold text-white bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700 transition-all ${isGoogleLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/></svg>
                                    {isGoogleLoading ? 'Redirecting...' : 'Continue with Google'}
                                </button>
                            </div>

                        </form>
                        <p className="text-center text-sm text-slate-500 mt-8 font-medium">
                            Don't have an account?{' '}
                            <button onClick={onNavigateToSignUp} className="font-bold text-white hover:text-cyan-400 transition-colors ml-1">
                                Sign up for an account
                            </button>
                        </p>
                    </div>
                </div>
            </main>
            <div className="mt-auto relative z-10">
                <PublicFooter onNavigateToAdmin={onNavigateToAdmin || (() => window.location.href = '/admin')} />
            </div>
        </div>
    );
};

export default SignInPage;
