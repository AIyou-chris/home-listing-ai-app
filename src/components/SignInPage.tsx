import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { AuthHeader } from './AuthHeader';
import { AuthFooter } from './AuthFooter';

interface SignInPageProps {
    onNavigateToSignUp: () => void;
    onNavigateToLanding: () => void;
    onNavigateToSection: (sectionId: string) => void;
    onEnterDemoMode: () => void;
}

const SignInPage: React.FC<SignInPageProps> = ({ onNavigateToSignUp, onNavigateToLanding, onNavigateToSection, onEnterDemoMode }) => {
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
                // If we have a session, assume we are good to go
                // Use a direct window location change if navigation fails? No, try calling the prop first.
                // Actually, App.tsx should handle this, but maybe it missed it?
                // Let's force a reload/redirect to dashboard
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
            // Race the Sign-In against a 15-second timeout
            // This prevents the "Loading Forever" experience if the network/client is stuck
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
            // Auth state change listener in App.tsx will handle the rest (redirects)
            // But just in case, let's manually trigger navigation if nothing happens in 1s
            setTimeout(() => {
                console.log('🔄 Manually triggering dashboard navigation...');
                window.location.href = '/dashboard';
            }, 1000);

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'An unexpected error occurred';
            setError(message);
            // alert(`Sign-in failed: ${message}`); // Removed alert, UI error is enough
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
            <AuthHeader onNavigateToSignUp={onNavigateToSignUp} onNavigateToSignIn={() => { }} onNavigateToLanding={onNavigateToLanding} onNavigateToSection={onNavigateToSection} onEnterDemoMode={onEnterDemoMode} />
            <main className="flex-grow flex items-center justify-center py-12">
                <div className="w-full max-w-md px-4 sm:px-0">
                    <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-slate-200/70">
                        <div className="text-center">
                            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Sign In to HomeListingAI</h1>
                            <p className="text-slate-500 mt-2">Welcome back! Please enter your details.</p>
                        </div>
                        {error && (
                            <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-lg text-sm" role="alert">
                                {error}
                            </div>
                        )}
                        <form className="mt-8 space-y-6" onSubmit={handleSignIn}>
                            <div>
                                <label htmlFor="email-address" className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
                                <input
                                    type="email"
                                    id="email-address"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                                    placeholder="you@example.com"
                                />
                            </div>
                            <div>
                                <div className="flex justify-between items-baseline">
                                    <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
                                    <button type="button" onClick={() => window.location.href = '/forgot-password'} className="text-sm font-semibold text-primary-600 hover:text-primary-500">Forgot password?</button>
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
                                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                                    />
                                    <button type="button" onClick={() => setIsPasswordVisible(!isPasswordVisible)} className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-500 hover:text-primary-600">
                                        <span className="material-symbols-outlined w-5 h-5">{isPasswordVisible ? 'visibility_off' : 'visibility'}</span>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className={`w-full flex justify-center items-center px-4 py-3.5 text-base font-semibold text-white bg-primary-600 rounded-lg shadow-md hover:bg-primary-700 transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {isLoading ? 'Signing In...' : 'Sign In'}
                                </button>
                            </div>

                        </form>
                        <p className="text-center text-sm text-slate-600 mt-8">
                            Don't have an account?{' '}
                            <button onClick={onNavigateToSignUp} className="font-semibold text-primary-600 hover:text-primary-500">
                                Sign up for an account
                            </button>
                        </p>
                    </div>
                </div>
            </main>
            <AuthFooter />
        </div>
    );
};

export default SignInPage;