import React from 'react';
import { AgentProfile } from '../types';
import { PlatformSubscriptionUI } from './PlatformSubscriptionUI';
import { ConnectOnboarding } from './ConnectOnboarding';
import { ProductManager } from './ProductManager';

interface PaymentsAndStorePageProps {
    agentProfile: AgentProfile;
    onBackToDashboard: () => void;
}

const PaymentsAndStorePage: React.FC<PaymentsAndStorePageProps> = ({
    agentProfile,
    onBackToDashboard
}) => {
    return (
        <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Payments & Store</h1>
                    <p className="text-slate-500 mt-2">Manage your subscription, payouts, and digital store.</p>
                </div>
                <button
                    onClick={onBackToDashboard}
                    className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-base">arrow_back</span>
                    Back to Pulse
                </button>
            </div>

            <div className="space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                    {/* 1. Platform Subscription */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-600">subscriptions</span>
                            Your Subscription
                        </h2>
                        <PlatformSubscriptionUI
                            accountId={agentProfile?.stripe_account_id || agentProfile?.id || ''}
                            currentPlan={(agentProfile?.plan as 'free' | 'pro') || 'free'}
                        />
                    </div>

                    {/* 2. Payout Settings */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-green-600">payments</span>
                            Payout Settings
                        </h2>
                        <ConnectOnboarding
                            userId={agentProfile?.id || ''}
                            email={agentProfile?.email || ''}
                            firstName={agentProfile?.first_name || agentProfile?.name?.split(' ')[0] || ''}
                        />
                    </div>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-600">storefront</span>
                            Store Management
                        </h2>
                        {agentProfile?.slug && (
                            <a
                                href={`/store/${agentProfile.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                View Live Store <span className="material-symbols-outlined text-base">open_in_new</span>
                            </a>
                        )}
                    </div>

                    {/* Only show Product Manager if they have a Connect Account ID */}
                    {agentProfile?.stripe_account_id ? (
                        <ProductManager accountId={agentProfile.stripe_account_id} />
                    ) : (
                        <div className="p-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                <span className="material-symbols-outlined text-3xl text-slate-300">lock</span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Store Locked</h3>
                            <p className="max-w-md mx-auto">Complete your Payout Settings above to unlock your digital store and start selling products.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PaymentsAndStorePage;
