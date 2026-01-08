import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthHeader } from './AuthHeader';
import { AuthFooter } from './AuthFooter';

const ResetPasswordPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isLinkValid, setIsLinkValid] = useState(true);
    const [debugSessionStatus, setDebugSessionStatus] = useState<string>('Initializing...');

    // Helper to get tokens from URL
    const getTokensFromUrl = () => {
        const hashParams = new URLSearchParams(location.hash.substring(1));
        return {
            accessToken: hashParams.get('access_token'),
            refreshToken: hashParams.get('refresh_token'),
            errorCode: hashParams.get('error_code'),
            errorDescription: hashParams.get('error_description')
        };
    };

    // Initial Setup
    useEffect(() => {
        const init = async () => {
            const { accessToken, refreshToken, errorCode, errorDescription } = getTokensFromUrl();

            if (errorCode || errorDescription) {
                console.error('❌ Reset Link Error:', errorCode, errorDescription);
                setIsLinkValid(false);
                setError(formatErrorMessage(errorCode, errorDescription));
                setDebugSessionStatus(`Link Error: ${errorCode}`);
                return;
            }

            // Attempt to restore session
            if (accessToken && refreshToken) {
                setDebugSessionStatus('Restoring Session from URL...');
                const { error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken
                });
                if (error) {
                    console.error('❌ Failed to set session:', error);
                    setDebugSessionStatus('Session Restore Failed');
                } else {
                    setDebugSessionStatus('Session Restored (Ready)');
                }
            } else {
                // Check if already active
                const { data: { session } } = await supabase.auth.getSession();
                setDebugSessionStatus(session ? 'Active Session Found' : 'No Session / No Tokens');
                if (!session) {
                    setIsLinkValid(false);
                    setError('Invalid link. Please try again.');
                }
            }
        };
        init();
    }, [location]);

    const formatErrorMessage = (code: string | null, desc: string | null): string => {
        if (code === 'otp_expired') return 'This link has expired. Please request a new one.';
        return desc ? decodeURIComponent(desc).replace(/\+/g, ' ') : 'Invalid reset link.';
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setIsLoading(true);
        console.log('🔄 SARTING UPDATE FLOW...');

        try {
            // 1. FINAL SESSION CHECK (The Fix)
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            console.log('Session Status at Start:', currentSession ? 'Active' : 'Missing');

            if (!currentSession) {
                // LAST DITCH RESCUE
                console.warn('⚠️ No session! Attempting JIT Restore...');
                const { accessToken, refreshToken } = getTokensFromUrl();
                if (accessToken && refreshToken) {
                    const { error: restoreError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    });
                    if (restoreError) throw new Error('Session lost and could not be restored.');
                    console.log('✅ JIT Session Restored.');
                } else {
                    throw new Error('No active session found. Please reload the link.');
                }
            }

            // 2. Perform Update with Timeout
            console.log('🔄 Calling updateUser...');
            const updatePromise = supabase.auth.updateUser({ password });

            const timeoutPromise = new Promise<{ error: any; data?: any }>((_, reject) =>
                setTimeout(() => reject(new Error('Update timed out. The server did not respond in time.')), 10000)
            );

            const result = await Promise.race([updatePromise, timeoutPromise]) as any;

            if (result.error) {
                console.error('❌ Update failed:', result.error);
                throw result.error;
            }

            console.log('✅ Password updated!');
            setMessage('Success! Password updated. Redirecting...');
            setTimeout(() => navigate('/dashboard'), 2000);

        } catch (err: unknown) {
            console.error('❌ Error caught:', err);
            const msg = err instanceof Error ? err.message : 'Update failed.';
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
            <AuthHeader
                onNavigateToSignUp={() => navigate('/signup')}
                onNavigateToSignIn={() => navigate('/signin')}
                onNavigateToLanding={() => navigate('/')}
                onNavigateToSection={() => { }}
                onEnterDemoMode={() => { }}
            />
            <main className="flex-grow flex items-center justify-center py-12">
                <div className="w-full max-w-md px-4 sm:px-0">
                    <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-slate-200/70">
                        <div className="text-center">
                            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Set New Password</h1>
                            <p className="text-slate-500 mt-2">Please enter your new password below.</p>
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

                        {/* Debug Indicator (Subtle) */}
                        <div className="text-xs text-slate-400 text-center mt-2 font-mono">
                            Status: {debugSessionStatus}
                        </div>

                        {!isLinkValid ? (
                            <div className="mt-8">
                                <button
                                    onClick={() => navigate('/forgot-password')}
                                    className="w-full flex justify-center items-center px-4 py-3.5 text-base font-semibold text-white bg-primary-600 rounded-lg shadow-md hover:bg-primary-700 transition-colors"
                                >
                                    Request New Link
                                </button>
                            </div>
                        ) : (
                            <form className="mt-8 space-y-6" onSubmit={handleUpdatePassword}>
                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="new-password" className="block text-sm font-semibold text-slate-700 mb-1.5">New Password</label>
                                        <div className="relative">
                                            <input
                                                type={isPasswordVisible ? "text" : "password"}
                                                id="new-password"
                                                required
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                                                placeholder="••••••••"
                                            />
                                            <button type="button" onClick={() => setIsPasswordVisible(!isPasswordVisible)} className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-500 hover:text-primary-600">
                                                <span className="material-symbols-outlined w-5 h-5">{isPasswordVisible ? 'visibility_off' : 'visibility'}</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="confirm-password" className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm Password</label>
                                        <input
                                            type={isPasswordVisible ? "text" : "password"}
                                            id="confirm-password"
                                            required
                                            value={confirmPassword}
                                            onChange={e => setConfirmPassword(e.target.value)}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className={`w-full flex justify-center items-center px-4 py-3.5 text-base font-semibold text-white bg-primary-600 rounded-lg shadow-md hover:bg-primary-700 transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                        {isLoading ? 'Updating...' : 'Update Password'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </main>
            <AuthFooter />
        </div>
    );
};

export default ResetPasswordPage;
