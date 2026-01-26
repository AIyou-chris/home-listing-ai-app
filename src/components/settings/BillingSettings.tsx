import React, { useState } from 'react';
import { BillingSettings, AgentProfile } from '../../types';
import { FeatureSection } from './SettingsCommon';

interface BillingSettingsProps {
    settings: BillingSettings;
    onSave: (settings: BillingSettings) => Promise<void>;
    onBack?: () => void;
    isLoading?: boolean;
    isBlueprintMode?: boolean;
    agentProfile?: AgentProfile;
}

const BillingSettingsPage: React.FC<BillingSettingsProps> = ({
    settings,
    onSave: _onSave,
    onBack: _onBack,
    isBlueprintMode,
    agentProfile
}) => {
    const [showBillingTips, setShowBillingTips] = useState(false);
    const [isRedirecting, setIsRedirecting] = useState(false);

    const planStatusBadges: Record<string, string> = {
        active: 'bg-green-100 text-green-700 border-green-200',
        past_due: 'bg-red-100 text-red-700 border-red-200',
        cancelled: 'bg-slate-100 text-slate-700 border-slate-200',
        trialing: 'bg-blue-100 text-blue-700 border-blue-200',
    };

    const planStatusLabels: Record<string, string> = {
        active: 'Active',
        past_due: 'Past Due',
        cancelled: 'Cancelled',
        trialing: 'Trial',
    };

    const handleCheckout = async (provider: string = 'stripe') => {
        setIsRedirecting(true);
        try {
            const slug = agentProfile?.slug;

            if (!slug) {
                alert('Account configuration error: No slug found.');
                setIsRedirecting(false);
                return;
            }

            const response = await fetch('/api/payments/checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    slug: slug,
                    provider,
                })
            });

            const data = await response.json();
            if (data.success && data.session?.url) {
                window.location.href = data.session.url;
            } else {
                console.error('Checkout Error:', data.error);
                alert('Failed to start checkout: ' + (data.error || 'Unknown error'));
                setIsRedirecting(false);
            }
        } catch (error) {
            console.error('Checkout Request Error:', error);
            alert('An error occurred. Please try again.');
            setIsRedirecting(false);
        }
    };

    const handlePortalSession = async () => {
        setIsRedirecting(true);

        if (isBlueprintMode) {
            setTimeout(() => {
                alert('This feature is a demo simulation. In production, this would redirect to the Stripe Customer Portal.');
                setIsRedirecting(false);
            }, 800);
            return;
        }

        try {
            const { supabase } = await import('../../services/supabase');
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                // Determine if we are in admin view or just lost auth
                console.error('User not found for portal redirect');
                // Fallback or alert
                alert('Could not identify user. Please refresh.');
                setIsRedirecting(false);
                return;
            }

            const response = await fetch('/api/payments/portal-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    returnUrl: window.location.href
                })
            });

            const data = await response.json();
            if (data.success && data.url) {
                window.location.href = data.url;
            } else {
                console.error('Portal Error:', data.error);
                alert('Failed to redirect: ' + (data.error || 'Unknown error'));
                setIsRedirecting(false);
            }
        } catch (error) {
            console.error('Portal Request Error:', error);
            alert('An error occurred. Please try again.');
            setIsRedirecting(false);
        }
    };

    const handleContactSupport = () => {
        window.dispatchEvent(new CustomEvent('open-chat', { detail: { mode: 'help' } }));
    };

    const cancelButtonDisabled = isRedirecting;

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
                                {settings.amount ? `$${settings.amount.toFixed(2)}` : '$69.00'}
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
                        {settings.planStatus === 'cancelled' || settings.planStatus === 'past_due' ? (
                            <button
                                type="button"
                                onClick={() => handleCheckout('stripe')}
                                disabled={isRedirecting}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-primary-700 font-semibold shadow hover:bg-slate-50 transition-colors ${isRedirecting ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                <span className="material-symbols-outlined text-base">rocket_launch</span>
                                {isRedirecting ? 'Opening checkout...' : 'Re-activate Subscription'}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handlePortalSession}
                                disabled={cancelButtonDisabled}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 bg-white/10 text-white transition-colors ${cancelButtonDisabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-white/20'}`}
                            >
                                <span className="material-symbols-outlined text-base">cancel</span>
                                Cancel Plan
                            </button>
                        )}
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

            {/* Usage Stats (New) */}
            <FeatureSection title="Usage & Limits" icon="bar_chart">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-500 text-sm font-medium">AI Voice Minutes</span>
                            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-semibold">
                                {settings.usage?.voiceMinutes || 0} / ∞ used
                            </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 mb-2">
                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: '5%' }}></div>
                        </div>
                        <p className="text-xs text-slate-400">Unlimited minutes included in Pro Plan.</p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-500 text-sm font-medium">SMS Sent</span>
                            <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-semibold">
                                {settings.usage?.smsCount || 0} / ∞ used
                            </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 mb-2">
                            <div className="bg-green-500 h-2 rounded-full" style={{ width: '5%' }}></div>
                        </div>
                        <p className="text-xs text-slate-400">Unlimited SMS included in Pro Plan.</p>
                    </div>
                </div>
            </FeatureSection>

            {/* Billing History */}
            <FeatureSection title="Billing History" icon="history">
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    {settings.history && settings.history.length > 0 ? (
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Description</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Invoice</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {settings.history.map((entry) => (
                                    <tr key={entry.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                            {entry.date}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">
                                            {entry.description || 'Subscription'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                            ${typeof entry.amount === 'number' ? entry.amount.toFixed(2) : entry.amount}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${entry.status === 'Paid' ? 'bg-green-100 text-green-800' :
                                                entry.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                {entry.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {entry.invoiceUrl ? (
                                                <a href={entry.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-900 flex items-center justify-end gap-1">
                                                    Download
                                                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                                                </a>
                                            ) : (
                                                <span className="text-slate-400">Unavailable</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="p-8 text-center text-slate-500">
                            No billing history available.
                        </div>
                    )}
                </div>
            </FeatureSection>
        </div>
    );
};

export default BillingSettingsPage;
