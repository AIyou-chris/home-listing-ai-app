import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { AuthHeader } from './AuthHeader';
import { AuthFooter } from './AuthFooter';

const ResetPasswordPage: React.FC = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    // Verify we have a session (Supabase link should have set it)
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                // If no session, the link might be invalid or expired.
                console.warn('⚠️ No active session found on Reset Password page.');
                setError('Invalid or expired reset link. Please try requesting a new one.');
            } else {
                console.log('✅ Active session verified for password reset.');
            }
        });
    }, []);

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
        console.log('🔄 Attempting password update...');

        try {
            // Race the Update against a 10-second timeout
            const updatePromise = supabase.auth.updateUser({ password });

            const timeoutPromise = new Promise<{ error: any; data?: any }>((_, reject) =>
                setTimeout(() => reject(new Error('Update timed out. Please check your connection and try again.')), 10000)
            );

            // Force cast to any to handle the race result
            const result = await Promise.race([updatePromise, timeoutPromise]) as any;

            if (result.error) {
                console.error('❌ Update failed:', result.error);
                throw result.error;
            }

            console.log('✅ Password updated successfully');
            setMessage('Password updated successfully! Redirecting to dashboard...');

            // Redirect after a brief pause so they see the success message
            setTimeout(() => {
                navigate('/dashboard');
            }, 2000);

        } catch (err: unknown) {
            console.error('❌ Error caught:', err);
            const msg = err instanceof Error ? err.message : 'Failed to update password.';
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
                    </div>
                </div>
            </main>
            <AuthFooter />
        </div>
    );
};

export default ResetPasswordPage;
