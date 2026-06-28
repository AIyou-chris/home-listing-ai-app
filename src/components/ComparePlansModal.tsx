import React from 'react';
import { useNavigate } from 'react-router-dom';

export const PENDING_PLAN_KEY = 'homelistingai:pending_plan';

interface ComparePlansModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Pre-highlight a specific plan. Defaults to 'pro'. */
    highlightPlan?: 'free' | 'starter' | 'pro';
    /** Context label shown at top of modal, e.g. "Upgrade to unlock videos" */
    contextLabel?: string;
    /**
     * Called when a PAID plan CTA is clicked from an authenticated context
     * (e.g. inside the dashboard). If omitted, the modal stores the plan in
     * sessionStorage and sends the user to /signup so they can create an
     * account first and finish the upgrade on first login.
     */
    onUpgrade?: (planId: 'starter' | 'pro') => void;
}

const CHECK = (
    <span className="material-symbols-outlined text-emerald-500 text-base leading-none">check_circle</span>
);
const CROSS = (
    <span className="material-symbols-outlined text-slate-300 text-base leading-none">remove</span>
);

const plans = [
    {
        id: 'free',
        name: 'Free',
        price: '$0',
        period: 'forever',
        tagline: 'Get started with one listing.',
        color: 'border-slate-200',
        badge: null,
        ctaLabel: 'Get Started Free',
        ctaStyle: 'border border-slate-300 text-slate-700 hover:bg-slate-50',
        checkoutPath: '/signup',
    },
    {
        id: 'starter',
        name: 'LO',
        price: '$149',
        period: '/mo',
        tagline: 'Build your agent network and fill your pipeline.',
        color: 'border-slate-200',
        badge: null,
        ctaLabel: 'Get LO Plan',
        ctaStyle: 'bg-slate-800 text-white hover:bg-slate-700',
        checkoutPath: '/lo-signup?plan=lo',
    },
    {
        id: 'pro',
        name: 'LO Pro',
        price: '$299',
        period: '/mo',
        tagline: 'High-volume LOs running a serious agent network.',
        color: 'border-primary-500',
        badge: 'MOST POPULAR',
        ctaLabel: 'Get LO Pro',
        ctaStyle: 'bg-primary-600 text-white hover:bg-primary-700',
        checkoutPath: '/lo-signup?plan=lo_pro',
    },
];

// Feature rows: [label, free, starter, pro, note?]
// true = check, false = cross, string = custom value
type FeatureValue = boolean | string;
const featureRows: { label: string; free: FeatureValue; starter: FeatureValue; pro: FeatureValue; section?: string }[] = [
    { section: 'Listings', label: '', free: false, starter: false, pro: false },
    { label: 'Active listings (partner network)', free: '1', starter: '20', pro: '50' },
    { label: 'AI buyer chatbot on each listing', free: false, starter: true, pro: true },
    { label: 'Full marketing package per listing', free: false, starter: true, pro: true },

    { section: 'Lead Machine', label: '', free: false, starter: false, pro: false },
    { label: 'Warm lead alerts (LO + agent)', free: false, starter: true, pro: true },
    { label: 'Pre-approval request capture', free: false, starter: true, pro: true },
    { label: 'Lead inbox + activity timeline', free: false, starter: true, pro: true },
    { label: 'Priority lead routing', free: false, starter: false, pro: true },

    { section: 'Branding', label: '', free: false, starter: false, pro: false },
    { label: 'Co-branded with your name + NMLS #', free: false, starter: true, pro: true },
    { label: 'Agent partner management dashboard', free: false, starter: false, pro: true },
    { label: 'ROI dashboard', free: false, starter: false, pro: true },

    { section: 'Communications', label: '', free: false, starter: false, pro: false },
    { label: 'Automated SMS / month', free: false, starter: '250 / mo', pro: 'Unlimited' },
    { label: 'Appointment reminder automation', free: false, starter: false, pro: true },

    { section: 'Support', label: '', free: false, starter: false, pro: false },
    { label: 'Support', free: 'Email', starter: 'Priority email', pro: 'Priority + onboarding' },
];

const Cell: React.FC<{ value: FeatureValue; isPro?: boolean }> = ({ value, isPro }) => {
    if (value === true) return <span className="flex justify-center">{CHECK}</span>;
    if (value === false) return <span className="flex justify-center">{CROSS}</span>;
    return (
        <span className={`text-xs font-medium text-center block ${isPro ? 'text-primary-600' : 'text-slate-700'}`}>
            {value}
        </span>
    );
};

const ComparePlansModal: React.FC<ComparePlansModalProps> = ({
    isOpen,
    onClose,
    highlightPlan = 'pro',
    contextLabel,
    onUpgrade,
}) => {
    const navigate = useNavigate();

    if (!isOpen) return null;

    const handlePlanCTA = (plan: typeof plans[number]) => {
        onClose();

        if (plan.id === 'free') {
            navigate('/lo-signup');
            return;
        }

        const planId = plan.id as 'starter' | 'pro';

        // Authenticated context (inside dashboard) — trigger Stripe immediately
        if (onUpgrade) {
            onUpgrade(planId);
            return;
        }

        // Unauthenticated visitor — store plan intent, send to signup
        try {
            sessionStorage.setItem(PENDING_PLAN_KEY, planId);
        } catch (_) { /* ignore */ }
        navigate(plan.checkoutPath);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Panel */}
            <div className="relative z-10 w-full max-w-5xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
                    <div>
                        {contextLabel && (
                            <p className="text-xs font-semibold uppercase tracking-widest text-primary-600 mb-0.5">
                                {contextLabel}
                            </p>
                        )}
                        <h2 className="text-lg font-bold text-slate-900">Compare Plans</h2>
                        <p className="text-sm text-slate-500">No long-term contracts. Cancel anytime.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full text-slate-400 hover:bg-slate-100 transition-colors"
                        aria-label="Close"
                    >
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="overflow-y-auto flex-1">

                    {/* Plan header cards */}
                    <div className="grid grid-cols-3 gap-0 border-b border-slate-100">
                        {plans.map((plan) => {
                            const isHighlighted = plan.id === highlightPlan;
                            return (
                                <div
                                    key={plan.id}
                                    className={`p-4 sm:p-6 flex flex-col items-center text-center gap-3 relative
                                        ${isHighlighted ? 'bg-primary-50 border-b-2 border-primary-500' : 'bg-white'}
                                    `}
                                >
                                    {plan.badge && (
                                        <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider bg-primary-600 text-white px-2 py-0.5 rounded-full">
                                            {plan.badge}
                                        </span>
                                    )}
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">
                                            {plan.name}
                                        </p>
                                        <div className="flex items-end justify-center gap-0.5">
                                            <span className={`text-3xl font-extrabold ${isHighlighted ? 'text-primary-700' : 'text-slate-900'}`}>
                                                {plan.price}
                                            </span>
                                            <span className="text-sm text-slate-400 mb-1">{plan.period}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1 hidden sm:block">{plan.tagline}</p>
                                    </div>
                                    <button
                                        onClick={() => handlePlanCTA(plan)}
                                        className={`w-full py-2 px-3 rounded-lg text-sm font-semibold transition-colors ${plan.ctaStyle}`}
                                    >
                                        {plan.ctaLabel}
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Feature comparison table */}
                    <table className="w-full text-sm">
                        <tbody>
                            {featureRows.map((row, i) => {
                                if (row.section) {
                                    return (
                                        <tr key={`section-${i}`} className="bg-slate-50">
                                            <td colSpan={4} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                                                {row.section}
                                            </td>
                                        </tr>
                                    );
                                }
                                return (
                                    <tr key={row.label} className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-2.5 text-slate-700 text-xs sm:text-sm w-2/5">{row.label}</td>
                                        <td className="px-2 py-2.5 text-center w-[20%]">
                                            <Cell value={row.free} />
                                        </td>
                                        <td className="px-2 py-2.5 text-center w-[20%]">
                                            <Cell value={row.starter} />
                                        </td>
                                        <td className="px-2 py-2.5 text-center w-[20%] bg-primary-50/40">
                                            <Cell value={row.pro} isPro />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* Footer */}
                    <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 text-center">
                        <p className="text-xs text-slate-500">
                            One closed loan covers 20+ months of the LO plan.{' '}
                            <span className="font-medium text-slate-700">7-day free trial. No contracts. Cancel anytime.</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComparePlansModal;
