import React, { useState } from 'react';
import { BillingSettings } from '../../types';
import { FeatureSection } from './SettingsCommon';

interface BillingSettingsProps {
    settings: BillingSettings;
    onSave: (settings: BillingSettings) => Promise<void>;
    onBack?: () => void;
    isLoading?: boolean;
}

const BillingSettingsPage: React.FC<BillingSettingsProps> = ({
    settings,
    onSave: _onSave,
    onBack,
}) => {
    const [showBillingTips, setShowBillingTips] = useState(false);

    const planStatusBadges: Record<string, string> = {
        active: 'bg-green-100 text-green-700 border-green-200',
        past_due: 'bg-red-100 text-red-700 border-red-200',
        canceled: 'bg-slate-100 text-slate-700 border-slate-200',
        trialing: 'bg-blue-100 text-blue-700 border-blue-200',
    };

    const planStatusLabels: Record<string, string> = {
        active: 'Active',
        past_due: 'Past Due',
        canceled: 'Canceled',
        trialing: 'Trial',
    };

    const handleBillingCheckout = () => {
        // Implement billing checkout logic
        // This likely redirects to Stripe or similar
        console.log("Redirecting to checkout...");
        // window.location.href = ...
    };

    const handleCancelMembership = () => {
        // Handle cancellation
        console.log("Cancelling membership...");
    };

    const handleContactSupport = () => {
        window.location.href = 'mailto:support@home-listing-ai-app.com';
    };

    const isBillingDisabled = false; // logic based on status
    const cancelButtonDisabled = false; // logic based on status

    return (
        <div className="p-8 space-y-8 animate-fadeIn">
            <div>
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-2xl font-bold text-slate-900">💳 Billing & Subscription</h2>
                </div>
                <p className="text-slate-500 mt-1">Manage your subscription, billing information, and payment methods.</p>
            </div>

            {/* Billing Tips */}
            <div className="bg-white border border-primary-100 rounded-xl shadow-sm">
                <button
                    type="button"
                    onClick={() => setShowBillingTips(prev => !prev)}
                    className="flex items-center gap-2 w-full px-5 py-3 text-sm font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 transition-colors rounded-t-xl"
                >
                    <span className="material-symbols-outlined text-xl">{showBillingTips ? 'psychiatry' : 'tips_and_updates'}</span>
                    {showBillingTips ? 'Hide Billing Tips' : 'Show Billing Tips'}
                    <span className="material-symbols-outlined text-base ml-auto">{showBillingTips ? 'expand_less' : 'expand_more'}</span>
                </button>
                {showBillingTips && (
                    <div className="px-5 pb-5 pt-4 border-t border-primary-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-600">
                            <div className="bg-primary-50 border border-primary-100 rounded-lg p-3">
                                <p className="font-semibold text-primary-700 mb-1">Download invoices</p>
                                <p>Use Billing History to grab receipts for bookkeeping—each line has a quick download link.</p>
                            </div>
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                                <p className="font-semibold text-blue-700 mb-1">Need to pause?</p>
                                <p>Use the cancel plan link below to schedule a downgrade at the end of the billing period.</p>
                            </div>
                            <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                                <p className="font-semibold text-green-700 mb-1">Upgrade anytime</p>
                                <p>Reach out to our team for custom plans if you need more AI power than the standard package.</p>
                            </div>
                            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                                <p className="font-semibold text-amber-700 mb-1">Keep forwarding active</p>
                                <p>Even after canceling, remember to disable email forwarding rules so leads stop routing to the AI.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <FeatureSection title="Current Plan" icon="star">
                <div className="bg-gradient-to-tr from-primary-700 to-primary-500 text-white rounded-2xl p-8 shadow-2xl">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                            <div className="flex flex-wrap items-center gap-3">
                                <h3 className="text-2xl font-bold text-white">{settings.planName || 'Subscription Plan'}</h3>
                                {settings.planStatus && (
                                    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${planStatusBadges[settings.planStatus] ?? 'bg-white/20 text-white border border-white/30'}`}>
                                        {planStatusLabels[settings.planStatus] ?? settings.planStatus}
                                    </span>
                                )}
                            </div>
                            <p className="mt-2 text-slate-300">Everything you need to dominate your market and close more deals.</p>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold">
                                {'$29.00'} {/* Placeholder for plan amount */}
                                <span className="text-lg font-medium">/mo</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                        {[
                            'Unlimited AI interactions per month',
                            'Advanced analytics dashboard',
                            'Automated follow-up sequences',
                            'Your AI sidekick trained on your brand',
                            'Lead capture to closing automations',
                            'Custom programs available any time'
                        ].map((feature) => (
                            <div key={feature} className="flex items-center gap-2">
                                <span className="material-symbols-outlined w-4 h-4 text-green-300">check_circle</span>
                                <span>{feature}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={handleBillingCheckout}
                            disabled={isBillingDisabled}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-white/40 bg-white/15 text-white font-semibold shadow transition-colors ${isBillingDisabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-white/25'}`}
                        >
                            <span className="material-symbols-outlined text-base">account_balance</span>
                            Manage Subscription
                        </button>
                        <button
                            type="button"
                            onClick={handleCancelMembership}
                            disabled={cancelButtonDisabled}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 bg-white/10 text-white transition-colors ${cancelButtonDisabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-white/20'}`}
                        >
                            <span className="material-symbols-outlined text-base">cancel</span>
                            Cancel Plan
                        </button>
                        <button
                            type="button"
                            onClick={handleContactSupport}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-primary-600 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                            <span className="material-symbols-outlined text-base">support_agent</span>
                            Talk to Support
                        </button>
                    </div>
                    <p className="mt-2 text-xs text-white/90">Changes to your subscription are managed securely through your configured payment provider.</p>
                </div>
            </FeatureSection>

            <div className="flex items-center justify-between pt-8 border-t border-slate-200">
                {onBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        className="px-6 py-2 text-slate-600 hover:text-slate-800 transition-colors"
                    >
                        ← Back to Dashboard
                    </button>
                )}
            </div>
        </div>
    );
};

export default BillingSettingsPage;
