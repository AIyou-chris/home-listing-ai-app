import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { AuthHeader } from './AuthHeader';
import { AuthFooter } from './AuthFooter';

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
        <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
            <AuthHeader
                onNavigateToSignUp={onNavigateToSignUp}
                onNavigateToSignIn={onNavigateToSignIn} // Important: Allow going back
                onNavigateToLanding={onNavigateToLanding}
                onNavigateToSection={() => { }}
                onEnterDemoMode={() => { }}
            />
            <main className="flex-grow flex items-center justify-center py-12">
                <div className="w-full max-w-md px-4 sm:px-0">
                    <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-slate-200/70">
                        <div className="text-center">
                            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Reset Password</h1>
                            <p className="text-slate-500 mt-2">Enter your email to receive recovery instructions.</p>
                        </div>

                        {message && (
                            <div className="mt-4 p-3 bg-green-50 text-green-800 border border-green-200 rounded-lg text-sm" role="alert">
                                {message}
                            </div>
                        )}

                        {error && (
                            <div className="mt-4 p-3 bg-red-50 text-red-800 border border-red-200 rounded-lg text-sm" role="alert">
                                {error}
                            </div>
                        )}

                        <form className="mt-8 space-y-6" onSubmit={handleReset}>
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
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className={`w-full flex justify-center items-center px-4 py-3.5 text-base font-semibold text-white bg-primary-600 rounded-lg shadow-md hover:bg-primary-700 transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                                </button>
                            </div>
                        </form>

                        <p className="text-center text-sm text-slate-600 mt-8">
                            Remember your password?{' '}
                            <button onClick={onNavigateToSignIn} className="font-semibold text-primary-600 hover:text-primary-500">
                                Sign In
                            </button>
                        </p>
                    </div>
                </div>
            </main>
            <AuthFooter />
        </div>
    );
};

export default ForgotPasswordPage;
