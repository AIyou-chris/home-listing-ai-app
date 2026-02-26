import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { PublicHeader } from './layout/PublicHeader';
import { PublicFooter } from './layout/PublicFooter';
import { BackgroundTechIcons } from './BackgroundTechIcons';

interface ForgotPasswordPageProps {
    onNavigateToSignUp: () => void;
    onNavigateToLanding: () => void;
    onNavigateToSignIn: () => void;
}

const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigateToSignUp, onNavigateToLanding, onNavigateToSignIn }) => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState(''); // Success message
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setIsLoading(true);

        try {
            // Updated to use window.location.origin to support both localhost and production
            const redirectUrl = `${window.location.origin}/reset-password`; // Ensure this route exists or Redirect to Home
            const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: redirectUrl,
            });

            if (error) throw error;

            setMessage('Check your email! We sent a password reset link.');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to send reset email.';
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#02050D] font-sans flex flex-col relative overflow-hidden text-white">

            <PublicHeader
                onNavigateToSignUp={onNavigateToSignUp}
                onNavigateToSignIn={onNavigateToSignIn}
                onEnterDemoMode={() => { }}
            />

            {/* Ambient Background Glows */}
            <BackgroundTechIcons />
            <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none -translate-x-1/2"></div>
            <div className="absolute bottom-1/4 right-0 w-[600px] h-[600px] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none translate-x-1/2"></div>

            <main className="flex-grow flex items-center justify-center py-24 sm:py-32 relative z-10">
                <div className="w-full max-w-md px-4 sm:px-0">
                    <div className="bg-[#0B1121]/80 backdrop-blur-md p-8 sm:p-10 rounded-3xl shadow-[0_0_40px_rgba(6,182,212,0.1)] border border-cyan-900/30">
                        <div className="text-center mb-8">
                            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Reset Password</h1>
                            <p className="text-slate-400 mt-3 font-light">Enter your email to receive recovery instructions.</p>
                        </div>

                        {message && (
                            <div className="mt-4 p-4 mb-6 bg-green-900/20 text-green-400 border border-green-900/50 rounded-xl text-sm" role="alert">
                                {message}
                            </div>
                        )}

                        {error && (
                            <div className="mt-4 p-4 mb-6 bg-red-900/20 text-red-400 border border-red-900/50 rounded-xl text-sm" role="alert">
                                {error}
                            </div>
                        )}

                        <form className="mt-8 space-y-6" onSubmit={handleReset}>
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

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className={`w-full flex justify-center items-center px-4 py-4 text-base font-bold text-slate-950 bg-white rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:bg-slate-200 hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] transition-all ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                                </button>
                            </div>
                        </form>

                        <p className="text-center text-sm text-slate-500 mt-8 font-medium">
                            Remember your password?{' '}
                            <button onClick={onNavigateToSignIn} className="font-bold text-white hover:text-cyan-400 transition-colors ml-1">
                                Sign In
                            </button>
                        </p>
                    </div>
                </div>
            </main>

            <div className="mt-auto relative z-10">
                <PublicFooter onNavigateToAdmin={() => window.location.href = '/admin'} />
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
