import React, { useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import { billingService, SUBSCRIPTION_PLANS, Subscription, Invoice } from '../services/billingService';
import Modal from './Modal';

interface BillingPageProps {
    onBackToDashboard: () => void;
}

const BillingPage: React.FC<BillingPageProps> = ({ onBackToDashboard }) => {
    const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        loadBillingData();
    }, []);

    const loadBillingData = async () => {
        if (!auth.currentUser) return;

        setIsLoading(true);
        try {
            const [subscription, billingHistory] = await Promise.all([
                billingService.getCurrentSubscription(auth.currentUser.uid),
                billingService.getBillingHistory(auth.currentUser.uid)
            ]);

            setCurrentSubscription(subscription);
            setInvoices(billingHistory);
        } catch (error) {
            console.error('Load billing data error:', error);
            setError('Failed to load billing information');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubscribe = async (planId: string) => {
        if (!auth.currentUser) return;

        setIsProcessing(true);
        setError('');

        try {
            const result = await billingService.createPayPalSubscription(auth.currentUser.uid, planId);
            
            if (result.success) {
                // Redirect to PayPal or show success message
                alert('Subscription created successfully! You will be redirected to PayPal to complete payment.');
                // In production, you'd redirect to PayPal checkout
                await loadBillingData();
            } else {
                setError(result.error || 'Failed to create subscription');
            }
        } catch (error) {
            console.error('Subscribe error:', error);
            setError('Failed to create subscription');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUpgrade = async () => {
        if (!auth.currentUser || !selectedPlan) return;

        setIsProcessing(true);
        setError('');

        try {
            const result = await billingService.upgradeSubscription(auth.currentUser.uid, selectedPlan);
            
            if (result.success) {
                alert('Subscription upgraded successfully!');
                setShowUpgradeModal(false);
                await loadBillingData();
            } else {
                setError(result.error || 'Failed to upgrade subscription');
            }
        } catch (error) {
            console.error('Upgrade error:', error);
            setError('Failed to upgrade subscription');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCancel = async (cancelImmediately: boolean) => {
        if (!auth.currentUser) return;

        setIsProcessing(true);
        setError('');

        try {
            const result = await billingService.cancelSubscription(auth.currentUser.uid, cancelImmediately);
            
            if (result.success) {
                alert(cancelImmediately ? 'Subscription cancelled immediately' : 'Subscription will cancel at the end of your billing period');
                setShowCancelModal(false);
                await loadBillingData();
            } else {
                setError(result.error || 'Failed to cancel subscription');
            }
        } catch (error) {
            console.error('Cancel error:', error);
            setError('Failed to cancel subscription');
        } finally {
            setIsProcessing(false);
        }
    };

    const getCurrentPlan = () => {
        if (!currentSubscription) return null;
        return SUBSCRIPTION_PLANS.find(plan => plan.id === currentSubscription.planId);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            case 'past_due': return 'bg-yellow-100 text-yellow-800';
            case 'trial': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="mt-4 text-slate-600">Loading billing information...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={onBackToDashboard}
                        className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                        Back to Dashboard
                    </button>
                    <h1 className="text-3xl font-bold text-slate-900">Billing & Plans</h1>
                    <p className="text-slate-600 mt-2">Manage your subscription, view invoices, and change your plan.</p>
                </div>

                {/* Launch Special Banner */}
                <div className="mb-8 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-green-600">local_offer</span>
                        <div>
                            <p className="text-green-800 font-semibold">🎉 Launch Special Pricing!</p>
                            <p className="text-green-700 text-sm">Limited time offer: $69/month (normally $149). Additional listings are $39 each.</p>
                        </div>
                    </div>
                </div>

                {/* Current Subscription Status */}
                {currentSubscription && (
                    <div className="mb-8 p-6 bg-white rounded-lg shadow-sm border border-slate-200">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">Current Subscription</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <p className="text-sm text-slate-500">Plan</p>
                                <p className="font-semibold text-slate-900">{currentSubscription.planName}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Status</p>
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(currentSubscription.status)}`}>
                                    {currentSubscription.status}
                                </span>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Next Billing</p>
                                <p className="font-semibold text-slate-900">
                                    {currentSubscription.currentPeriodEnd.toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                        {currentSubscription.cancelAtPeriodEnd && (
                            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-yellow-800 text-sm">
                                    ⚠️ Your subscription will cancel at the end of your current billing period.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-800">{error}</p>
                    </div>
                )}

                {/* Subscription Plans */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                    {SUBSCRIPTION_PLANS.map((plan) => {
                        const isCurrentPlan = currentSubscription?.planId === plan.id;
                        const isUpgrade = currentSubscription && !isCurrentPlan;

                        return (
                            <div
                                key={plan.id}
                                className={`p-8 rounded-2xl shadow-lg border-2 ${
                                    isCurrentPlan 
                                        ? 'border-primary-500 bg-primary-50' 
                                        : 'bg-white border-slate-200'
                                }`}
                            >
                                {plan.name === 'Pro Team' && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                        <span className="px-4 py-1 bg-purple-600 text-white text-xs font-bold uppercase rounded-full">
                                            Most Popular
                                        </span>
                                    </div>
                                )}

                                <h3 className="text-xl font-bold text-slate-800">{plan.name}</h3>
                                <p className="mt-2 text-slate-500 h-12">{plan.description}</p>
                                
                                <p className="mt-6">
                                    <span className="text-5xl font-extrabold text-slate-900">
                                        {plan.price === 0 ? 'Custom' : `$${plan.price}`}
                                    </span>
                                    {plan.price > 0 && <span className="text-xl font-medium text-slate-500">/mo</span>}
                                </p>

                                {plan.originalPrice && plan.discount && (
                                    <p className="mt-1 text-sm text-slate-500">
                                        <span className="line-through text-slate-400">Normally ${plan.originalPrice}</span>
                                        <span className="ml-2 text-green-600 font-semibold">{plan.discount}% OFF</span>
                                    </p>
                                )}

                                <p className="mt-1 text-sm text-slate-500">
                                    {plan.limitations.listings === -1 
                                        ? 'Unlimited Listings' 
                                        : `Up to ${plan.limitations.listings} Active Listings`
                                    }
                                    {plan.limitations.agents && plan.limitations.agents > 0 && ` & ${plan.limitations.agents} Agent Seats`}
                                </p>

                                <button
                                    disabled={isCurrentPlan || isProcessing}
                                    onClick={() => {
                                        if (isUpgrade) {
                                            setSelectedPlan(plan.id);
                                            setShowUpgradeModal(true);
                                        } else if (plan.price === 0) {
                                            // Contact for custom pricing
                                            window.open('mailto:sales@homelistingai.com?subject=Brokerage Plan Inquiry', '_blank');
                                        } else {
                                            handleSubscribe(plan.id);
                                        }
                                    }}
                                    className={`w-full mt-8 py-3 px-6 text-lg font-bold rounded-lg transition-colors duration-300 ${
                                        isCurrentPlan
                                            ? 'bg-slate-400 text-white cursor-not-allowed'
                                            : plan.price === 0
                                            ? 'bg-slate-800 text-white shadow-md hover:bg-slate-900'
                                            : 'bg-primary-600 text-white shadow-md hover:bg-primary-700'
                                    }`}
                                >
                                    {isProcessing ? 'Processing...' : 
                                     isCurrentPlan ? 'Current Plan' : 
                                     isUpgrade ? 'Upgrade Plan' :
                                     plan.price === 0 ? 'Contact Us' : 'Choose Plan'}
                                </button>

                                <ul className="mt-8 space-y-4">
                                    {plan.features.map((feature, index) => (
                                        <li key={index} className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-green-500 w-5 h-5">check</span>
                                            <span className="text-sm text-slate-700">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>

                {/* Current Plan Actions */}
                {currentSubscription && (
                    <div className="mb-8 p-6 bg-white rounded-lg shadow-sm border border-slate-200">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Manage Your Subscription</h3>
                        <div className="flex flex-wrap gap-4">
                            <button
                                onClick={() => setShowCancelModal(true)}
                                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Cancel Subscription
                            </button>
                            <button
                                onClick={() => window.open(billingService.getCancellationInstructions(), '_blank')}
                                className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                            >
                                Cancellation Instructions
                            </button>
                        </div>
                    </div>
                )}

                {/* Billing History */}
                <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                    <div className="p-6 border-b border-slate-200">
                        <h3 className="text-lg font-semibold text-slate-900">Billing History</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="text-left p-4 font-semibold text-slate-700">Invoice ID</th>
                                    <th className="text-left p-4 font-semibold text-slate-700">Date</th>
                                    <th className="text-left p-4 font-semibold text-slate-700">Amount</th>
                                    <th className="text-left p-4 font-semibold text-slate-700">Status</th>
                                    <th className="text-left p-4 font-semibold text-slate-700">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {invoices.length > 0 ? (
                                    invoices.map((invoice) => (
                                        <tr key={invoice.id}>
                                            <td className="p-4 font-medium text-slate-700">{invoice.id}</td>
                                            <td className="p-4 text-slate-600">
                                                {invoice.createdAt.toLocaleDateString()}
                                            </td>
                                            <td className="p-4 text-slate-600">
                                                ${invoice.amount.toFixed(2)} {invoice.currency}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                                                    {invoice.status}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <button className="flex items-center gap-1 text-primary-600 hover:text-primary-800">
                                                    <span className="material-symbols-outlined w-4 h-4">download</span>
                                                    <span className="text-sm">PDF</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-500">
                                            No billing history available
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Cancel Subscription Modal */}
            <Modal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)}>
                <div className="p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Cancel Subscription</h3>
                    <p className="text-slate-600 mb-6">
                        Are you sure you want to cancel your subscription? You can choose to cancel immediately or at the end of your current billing period.
                    </p>
                    <div className="space-y-4">
                        <button
                            onClick={() => handleCancel(false)}
                            disabled={isProcessing}
                            className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                        >
                            {isProcessing ? 'Processing...' : 'Cancel at End of Period'}
                        </button>
                        <button
                            onClick={() => handleCancel(true)}
                            disabled={isProcessing}
                            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            {isProcessing ? 'Processing...' : 'Cancel Immediately'}
                        </button>
                        <button
                            onClick={() => setShowCancelModal(false)}
                            disabled={isProcessing}
                            className="w-full px-4 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 transition-colors"
                        >
                            Keep Subscription
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Upgrade Subscription Modal */}
            <Modal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)}>
                <div className="p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Upgrade Subscription</h3>
                    <p className="text-slate-600 mb-6">
                        Are you sure you want to upgrade your subscription? The new plan will be effective immediately.
                    </p>
                    <div className="space-y-4">
                        <button
                            onClick={handleUpgrade}
                            disabled={isProcessing}
                            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                        >
                            {isProcessing ? 'Processing...' : 'Confirm Upgrade'}
                        </button>
                        <button
                            onClick={() => setShowUpgradeModal(false)}
                            disabled={isProcessing}
                            className="w-full px-4 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default BillingPage;
