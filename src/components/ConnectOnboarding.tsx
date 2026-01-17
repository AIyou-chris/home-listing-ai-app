import React, { useEffect, useState } from 'react';
import { connectService, AccountStatusResponse } from '../services/connectService';

interface ConnectOnboardingProps {
    userId: string;
    email: string;
    firstName: string;
}

export const ConnectOnboarding: React.FC<ConnectOnboardingProps> = ({ userId, email, firstName }) => {
    const [status, setStatus] = useState<AccountStatusResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // In a real app, you'd fetch the existing stripe_account_id from your user profile first
    // For this demo, we might rely on the backend to tell us, or we store it in local state/context
    // Let's assume the parent passes us an accountId if one exists, or we fetch it.
    // For simplicity, let's assume we don't have it yet, or we fetch status if we do.
    const [accountId, setAccountId] = useState<string | null>(null);

    const checkStatus = React.useCallback(async () => {
        if (!accountId) return;
        try {
            const statusData = await connectService.getAccountStatus(accountId);
            setStatus(statusData);
        } catch (err) {
            console.error('Failed to get status', err);
        }
    }, [accountId]);

    useEffect(() => {
        if (accountId) {
            checkStatus();
        }
    }, [accountId, checkStatus]);

    const handleOnboard = async () => {
        setLoading(true);
        setError(null);
        try {
            let currentAccountId = accountId;

            // 1. Create Account if we don't have one
            if (!currentAccountId) {
                const account = await connectService.createAccount({ userId, email, firstName });
                currentAccountId = account.accountId;
                setAccountId(currentAccountId);
            }

            // 2. Get Link
            const link = await connectService.getOnboardingLink(currentAccountId);

            // 3. Redirect
            window.location.href = link;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Onboarding failed';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    if (status?.onboardingComplete && status?.readyToProcessPayments) {
        return (
            <div className="p-6 bg-green-50 border border-green-200 rounded-xl">
                <h3 className="text-lg font-semibold text-green-800 flex items-center gap-2">
                    <span className="material-symbols-outlined">check_circle</span>
                    Payments Active
                </h3>
                <p className="text-green-700 mt-2">
                    Your account is fully set up to accept payments!
                </p>
                <div className="mt-4">
                    <button
                        onClick={handleOnboard}
                        className="text-sm font-medium text-green-700 underline hover:text-green-800"
                    >
                        Update Payment Settings
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Enable Payments</h3>
            <p className="text-slate-600 mb-6">
                To start selling products and collecting fees, you need to set up your payout information with Stripe.
            </p>

            {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                    {error}
                </div>
            )}

            <button
                onClick={handleOnboard}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
                {loading ? (
                    <span>Processing...</span>
                ) : (
                    <>
                        <span>Setup Payouts</span>
                        <span className="material-symbols-outlined text-sm">open_in_new</span>
                    </>
                )}
            </button>

            {status && !status.onboardingComplete && (
                <p className="mt-3 text-sm text-yellow-600 flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">warning</span>
                    Action required to complete setup
                </p>
            )}
        </div>
    );
};
