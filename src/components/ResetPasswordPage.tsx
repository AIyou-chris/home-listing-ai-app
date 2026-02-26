import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { PublicHeader } from './layout/PublicHeader';
import { PublicFooter } from './layout/PublicFooter';
import { BackgroundTechIcons } from './BackgroundTechIcons';

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
    const getTokensFromUrl = React.useCallback(() => {
        const hashParams = new URLSearchParams(location.hash.substring(1));
        return {
            accessToken: hashParams.get('access_token'),
            refreshToken: hashParams.get('refresh_token'),
            errorCode: hashParams.get('error_code'),
            errorDescription: hashParams.get('error_description')
        };
    }, [location.hash]);

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
            // STRATEGY: Wait 1s to let Supabase Auto-Detect finish. 
            // If we force setSession too fast, it conflicts with the client's own listeners.
            setDebugSessionStatus('Waiting for Auto-Detect...');
            await new Promise(resolve => setTimeout(resolve, 1000));

            const { data: { session: existingSession } } = await supabase.auth.getSession();

            if (existingSession) {
                setDebugSessionStatus('Session Restored (Auto)');
                return;
            }

            // If auto-detect failed, THEN we manually force it
            if (accessToken && refreshToken) {
                setDebugSessionStatus('Auto failed. Forcing Session...');
                const { error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken
                });
                if (error) {
                    console.error('❌ Failed to set session:', error);
                    setDebugSessionStatus('Session Restore Failed: ' + error.message);
                } else {
                    setDebugSessionStatus('Session Restored (Manual)');
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
    }, [getTokensFromUrl]);

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

            const timeoutPromise = new Promise<{ error: unknown; data?: unknown }>((_, reject) =>
                setTimeout(() => reject(new Error('Update timed out. The server did not respond in time.')), 10000)
            );

            const result = await Promise.race([updatePromise, timeoutPromise]) as { error: unknown; data?: unknown };

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
        <div className="min-h-screen bg-[#02050D] font-sans flex flex-col relative overflow-hidden text-white">
            <PublicHeader
                onNavigateToSignUp={() => navigate('/signup')}
                onNavigateToSignIn={() => navigate('/signin')}
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
                            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Set New Password</h1>
                            <p className="text-slate-400 mt-3 font-light">Please enter your new password below.</p>
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

                        {/* Debug Indicator (Subtle) */}
                        <div className="text-xs text-slate-600 text-center mt-2 font-mono">
                            Status: {debugSessionStatus}
                        </div>

                        {!isLinkValid ? (
                            <div className="mt-8">
                                <button
                                    onClick={() => navigate('/forgot-password')}
                                    className="w-full flex justify-center items-center px-4 py-4 text-base font-bold text-slate-950 bg-white rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:bg-slate-200 hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] transition-all"
                                >
                                    Request New Link
                                </button>
                            </div>
                        ) : (
                            <form className="mt-8 space-y-6" onSubmit={handleUpdatePassword}>
                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="new-password" className="block text-sm font-semibold text-slate-300 mb-2">New Password</label>
                                        <div className="relative">
                                            <input
                                                type={isPasswordVisible ? "text" : "password"}
                                                id="new-password"
                                                required
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                className="w-full px-4 py-3.5 bg-white/5 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-light"
                                                placeholder="••••••••"
                                            />
                                            <button type="button" onClick={() => setIsPasswordVisible(!isPasswordVisible)} className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-cyan-400 transition-colors">
                                                <span className="material-symbols-outlined w-5 h-5">{isPasswordVisible ? 'visibility_off' : 'visibility'}</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="confirm-password" className="block text-sm font-semibold text-slate-300 mb-2">Confirm Password</label>
                                        <input
                                            type={isPasswordVisible ? "text" : "password"}
                                            id="confirm-password"
                                            required
                                            value={confirmPassword}
                                            onChange={e => setConfirmPassword(e.target.value)}
                                            className="w-full px-4 py-3.5 bg-white/5 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-light"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className={`w-full flex justify-center items-center px-4 py-4 text-base font-bold text-slate-950 bg-white rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:bg-slate-200 hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] transition-all ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                        {isLoading ? 'Updating...' : 'Update Password'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </main>

            <div className="mt-auto relative z-10">
                <PublicFooter onNavigateToAdmin={() => window.location.href = '/admin'} />
            </div>
        </div>
    );
};

export default ResetPasswordPage;
