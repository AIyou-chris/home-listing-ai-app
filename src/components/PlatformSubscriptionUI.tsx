import React, { useState } from 'react';
import { connectService } from '../services/connectService';

interface PlatformSubscriptionUIProps {
    accountId: string; // The Connected Account ID
    currentPlan?: string;
}

export const PlatformSubscriptionUI: React.FC<PlatformSubscriptionUIProps> = ({ accountId, currentPlan = 'free' }) => {
    const [loading, setLoading] = useState(false);

    const PRO_PRICE_ID = import.meta.env.VITE_STRIPE_PRO_PRICE_ID || 'price_PLACEHOLDER_MISSING'; // Must be set in .env

    const handleSubscribe = async () => {
        setLoading(true);
        try {
            const url = await connectService.createPlatformSubscription(accountId, PRO_PRICE_ID);
            window.location.href = url;
        } catch (err) {
            alert('Failed to start subscription');
        } finally {
            setLoading(false);
        }
    };

    const handleManage = async () => {
        setLoading(true);
        try {
            const url = await connectService.createPortalSession(accountId);
            window.location.href = url;
        } catch (err) {
            alert('Failed to open billing portal');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl text-white shadow-xl">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-xl font-bold">Platform Plan</h3>
                    <p className="text-slate-400 text-sm mt-1">Unlock advanced AI features for your agency.</p>
                </div>
                <div className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
                    {currentPlan === 'pro' ? 'PRO ACTIVE' : 'FREE TIER'}
                </div>
            </div>

            <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-green-400">check</span>
                    <span>Unlimited AI Listings</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-green-400">check</span>
                    <span>Priority Support</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-slate-500 material-symbols-outlined">check</span>
                    <span className="text-slate-400 line-through">Custom Branding</span>
                </div>
            </div>

            {currentPlan === 'free' ? (
                <button
                    onClick={handleSubscribe}
                    disabled={loading}
                    className="w-full py-3 bg-white text-slate-900 font-bold rounded-lg hover:bg-slate-100 disabled:opacity-70 transition-colors"
                >
                    {loading ? 'Processing...' : 'Upgrade to Pro - $29/mo'}
                </button>
            ) : (
                <button
                    onClick={handleManage}
                    disabled={loading}
                    className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500 disabled:opacity-70 transition-colors"
                >
                    {loading ? 'Opening Portal...' : 'Manage Subscription'}
                </button>
            )}

            <p className="text-center text-xs text-slate-500 mt-4">
                Secure payment processed by Stripe
            </p>
        </div>
    );
};
