import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { PublicHeader } from './layout/PublicHeader';
import { PublicFooter } from './layout/PublicFooter';
import { BackgroundTechIcons } from './BackgroundTechIcons';

interface SignInPageProps {
    onNavigateToSignUp: () => void;
    onNavigateToLanding: () => void;
    onNavigateToSection: (sectionId: string) => void;
    onEnterDemoMode: () => void;
    onNavigateToAdmin?: () => void;
}

const SignInPage: React.FC<SignInPageProps> = ({ onNavigateToSignUp, onNavigateToLanding, onEnterDemoMode, onNavigateToAdmin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Check for existing session on mount
    React.useEffect(() => {
        const checkSession = async () => {
            console.log('🔍 SignInPage: Checking for existing session...');
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                console.log('✅ SignInPage: Active session found, redirecting...');
                window.location.href = '/dashboard';
            } else {
                console.log('⚪ SignInPage: No active session.');
            }
        };
        checkSession();
    }, []);

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
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

            console.log('✅ Sign In Success! Session Established.');
            setTimeout(() => {
                console.log('🔄 Manually triggering dashboard navigation...');
                window.location.href = '/dashboard';
            }, 1000);

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
                            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Sign In to HomeListingAI</h1>
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
                                    <button type="button" onClick={() => window.location.href = '/forgot-password'} className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">Forgot password?</button>
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

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className={`w-full flex justify-center items-center px-4 py-4 text-base font-bold text-slate-950 bg-white rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:bg-slate-200 hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] transition-all ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {isLoading ? 'Signing In...' : 'Sign In'}
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