import React, { useEffect, useState } from 'react';
import AnalyticsPage from '../AnalyticsPage';
import QuickEmailModal from '../QuickEmailModal';
import SignatureEditorModal from '../SignatureEditorModal';
import SequenceFeedbackPanel from '../SequenceFeedbackPanel';
import { funnelService } from '../../services/funnelService';
import { authService } from '../../services/authService';
import PageTipBanner from '../PageTipBanner';
import LeadImportModal from './LeadImportModal';
import OutreachTemplatesModal from './OutreachTemplatesModal';
import { useLeadAnalyticsStore } from '../../state/useLeadAnalyticsStore';
import AdminSalesFunnelPanel from '../AdminSalesFunnelPanel';

interface FunnelAnalyticsPanelProps {
    onBackToDashboard?: () => void;
    variant?: 'page' | 'embedded';
    title?: string;
    subtitle?: string;
    hideBackButton?: boolean;
    isDemoMode?: boolean;
}

const highlightCards = [
    {
        id: 'health',
        icon: 'insights',
        title: 'AI Funnel',
        body: 'Track how many leads are captured, contacted, qualified, and booked straight from the dashboard.',
        targetSection: 'funnels' as const,
        bgClass: 'bg-sky-50',
        borderClass: 'border-sky-200',
        iconClass: 'text-sky-600 bg-white'
    },
    {
        id: 'scoring',
        icon: 'workspace_premium',
        title: 'Lead Scoring Engine',
        body: 'See the rules, tiers, and point gains that determine which prospects graduate to Hot or stay in nurture.',
        targetSection: 'scoring' as const,
        bgClass: 'bg-indigo-50',
        borderClass: 'border-indigo-200',
        iconClass: 'text-indigo-600 bg-white'
    },
    {
        id: 'sequence',
        icon: 'auto_fix_high',
        title: 'Sequence Feedback',
        body: 'Compare which automations spark responses so you know when to duplicate, pause, or remix a funnel.',
        targetSection: 'feedback' as const,
        bgClass: 'bg-emerald-50',
        borderClass: 'border-emerald-200',
        iconClass: 'text-emerald-600 bg-white'
    }
] as const;

// Initial data removed

const AdminMarketingFunnelsPanel: React.FC<FunnelAnalyticsPanelProps> = ({
    onBackToDashboard,
    variant = 'page',
    title = 'Marketing Funnels',
    subtitle = 'AI-powered marketing campaigns for HomeListingAI program',
    hideBackButton = false,
    isDemoMode = false
}) => {
    // Admin-only: Use real user ID (so DB foreign key works) or fallback to 'admin-marketing' if testing
    const [userId, setUserId] = useState('admin-marketing');

    useEffect(() => {
        // Initial check
        authService.getCurrentAgentProfile().then(profile => {
            if (profile?.id) setUserId(profile.id);
        });

        // Reactive listener for race conditions
        const unsubscribe = authService.addAuthStateListener((state) => {
            if (state.user?.uid) {
                setUserId(state.user.uid);
            }
        });

        return () => unsubscribe();
    }, []);

    const ADMIN_MARKETING_USER_ID = userId;
    const isEmbedded = variant === 'embedded';

    // State Cleaning
    const [isQuickEmailOpen, setIsQuickEmailOpen] = useState(false);
    // Removed unused panel state
    const [activeSection, setActiveSection] = useState<'funnels' | 'scoring' | 'feedback'>('funnels');
    // Removed unused test/call state (sendingTestId, testPhone, testEmail)
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [customSignature, setCustomSignature] = useState<string>('');
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);

    // Analytics Refresh
    const refreshAnalytics = useLeadAnalyticsStore((state) => state.refresh);
    const [refreshKey, setRefreshKey] = useState(0);

    // Removed handleSendTestEmail

    // Removed Agent Sales Handlers



    // QR Code Generator



    return (
        <div className={isEmbedded ? '' : 'bg-slate-50 min-h-full pb-24 md:pb-0'}>
            <div className={`${isEmbedded ? '' : 'mx-auto max-w-screen-2xl'} ${isEmbedded ? 'py-6' : 'py-10'} px-0 md:px-6 lg:px-8`}>
                {!hideBackButton && onBackToDashboard && (
                    <button
                        type="button"
                        onClick={onBackToDashboard}
                        className="mb-6 flex items-center space-x-2 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-800 px-4 md:px-0"
                    >
                        <span className="material-symbols-outlined w-5 h-5">chevron_left</span>
                        <span>Back to Blueprint Overview</span>
                    </button>
                )}

                <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between px-4 md:px-0">
                    <div className="space-y-2">
                        <p className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                            <span className="material-symbols-outlined text-base">monitoring</span>
                            AI Funnel
                        </p>
                        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
                        <p className="text-sm text-slate-500 sm:text-base">
                            {subtitle}
                        </p>
                    </div>
                    {activeSection === 'funnels' && (
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setIsImportModalOpen(true)}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                            >
                                <span className="material-symbols-outlined text-base">upload_file</span>
                                Import Leads
                            </button>

                            <LeadImportModal
                                isOpen={isImportModalOpen}
                                onClose={() => setIsImportModalOpen(false)}
                                onImport={(leads, assignment) => {
                                    alert(`Successfully queued ${leads.length} leads for import to ${assignment.funnel}!`);
                                    refreshAnalytics();
                                    setRefreshKey(prev => prev + 1);
                                }}
                            />

                            <button
                                type="button"
                                onClick={() => setIsTemplatesModalOpen(true)}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50"
                            >
                                <span className="material-symbols-outlined text-base">library_books</span>
                                Agent Templates
                            </button>

                            {/* REMOVED: Open House QR & Email Library for Admin */}
                            <button
                                onClick={() => setIsSignatureModalOpen(true)}
                                className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-50 shadow-sm transition-colors"
                            >
                                <span className="material-symbols-outlined text-indigo-600">badge</span>
                                Edit Global Signature
                                {customSignature && (
                                    <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">
                                        Active
                                    </span>
                                )}
                            </button>
                        </div>
                    )}
                </header>

                {/* Test Configuration Card Removed */}

                <div className="mb-8 px-4 md:px-0">
                    <PageTipBanner
                        pageKey="ai-funnels"
                        expandedContent={
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-semibold text-slate-900 mb-2">🚀 Power Up Your AI Funnels:</h4>
                                    <ul className="space-y-2 text-slate-700">
                                        <li className="flex items-start">
                                            <span className="mr-2">✏️</span>
                                            <span><strong>Complete Control:</strong> Edit any step to customize the voice. You can mix emails, texts, and task reminders to build the perfect nurturing journey.</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="mr-2">💬</span>
                                            <span><strong>Multi-Channel Magic:</strong> Don't just email. Set up automated text sequences that feel personal, triggering real conversations that the AI takes over instantly.</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="mr-2">🔄</span>
                                            <span><strong>Smart Follow-Ups:</strong> Configure specific time delays (2 days, 1 week) so your leads hear from you exactly when it counts, running 24/7 in the background.</span>
                                        </li>
                                    </ul>
                                </div>
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
                                    <h4 className="font-semibold text-blue-900 mb-2">💎 Why It Works:</h4>
                                    <p className="text-blue-800">
                                        Most agents give up after 2 attempts. These AI funnels persist indefinitely, turning cold leads warm and booking appointments automatically so you wake up to a booked calendar.
                                    </p>
                                </div>
                            </div>
                        }
                    />
                </div>

                <div className="hidden md:grid mb-8 grid-cols-1 gap-4 md:grid-cols-3">
                    {highlightCards.map((card) => {
                        const isActive = activeSection === card.targetSection;
                        return (
                            <button
                                key={card.title}
                                type="button"
                                onClick={() => setActiveSection(card.targetSection)}
                                className={`flex items-start gap-3 rounded-2xl border px-4 py-4 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${card.bgClass
                                    } ${card.borderClass} ${isActive ? 'ring-2 ring-offset-1 ring-blue-200' : 'hover:border-blue-200'} `}
                            >
                                <div className={`rounded-full p-2 shadow-sm ${card.iconClass}`}>
                                    <span className="material-symbols-outlined text-xl">{card.icon}</span>
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-800">{card.title}</h3>
                                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{card.body}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {activeSection === 'funnels' && (
                    <div className="space-y-8">
                        {/* RECRUITMENT FUNNEL PANEL (Replaces Grid) */}
                        <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
                            <AdminSalesFunnelPanel
                                variant="embedded"
                                title="Agent Recruitment Sequence"
                                subtitle="The active 'In Your Face' funnel for imported leads."
                            />
                        </div>
                    </div>
                )}

                {activeSection === 'scoring' && (
                    <div className="bg-white border-y border-slate-200 md:border md:rounded-2xl p-6 shadow-sm">
                        <div className="mb-6 space-y-2">
                            <p className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                                <span className="material-symbols-outlined text-base">workspace_premium</span>
                                Lead Scoring Engine
                            </p>
                            <h2 className="text-2xl font-bold text-slate-900">Scoring Rules & Tiers</h2>
                            <p className="text-sm text-slate-500">
                                See the rules, tiers, and point gains that determine which prospects graduate to Hot or stay in nurture.
                            </p>
                        </div>
                        <AnalyticsPage key={refreshKey} isDemoMode={isDemoMode} />
                    </div>
                )}

                {activeSection === 'feedback' && (
                    <div className="bg-white border-y border-slate-200 md:border md:rounded-2xl p-6 shadow-sm">
                        <div className="mb-6 space-y-2">
                            <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                                <span className="material-symbols-outlined text-base">auto_fix_high</span>
                                Sequence Feedback
                            </p>
                            <h2 className="text-2xl font-bold text-slate-900">Automation Performance</h2>
                            <p className="text-sm text-slate-500">
                                Compare reply rates, openings, and meeting bookings for every drip so you know where to iterate next.
                            </p>
                        </div>
                        <SequenceFeedbackPanel key={refreshKey} isDemoMode={isDemoMode} />
                    </div>
                )}
            </div>
            {/* Modals */}
            <LeadImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={(leads, assignment) => {
                    console.log('Importing leads:', leads, assignment);
                    alert(`Successfully queued ${leads.length} leads for import to ${assignment.funnel}!`);
                }}
            />

            <OutreachTemplatesModal
                isOpen={isTemplatesModalOpen}
                onClose={() => setIsTemplatesModalOpen(false)}
            />

            {isQuickEmailOpen && <QuickEmailModal onClose={() => setIsQuickEmailOpen(false)} isDemoMode={isDemoMode} />}

            <SignatureEditorModal
                isOpen={isSignatureModalOpen}
                onClose={() => setIsSignatureModalOpen(false)}
                initialSignature={customSignature || "Best regards,<br/><strong>Isabella</strong>"}
                onSave={(newSig) => {
                    setCustomSignature(newSig);
                    funnelService.saveSignature(ADMIN_MARKETING_USER_ID, newSig)
                        .then(ok => ok ? console.log('Signature saved') : alert('Failed to save signature'));
                }}
            />
            {/* Mobile Fixed Navigation Bar */}
            {
                !isEmbedded && (
                    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 md:hidden flex justify-around items-center px-2 py-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                        {highlightCards.map((card) => {
                            const isActive = activeSection === card.targetSection;
                            return (
                                <button
                                    key={card.id}
                                    onClick={() => setActiveSection(card.targetSection)}
                                    className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <span className={`material-symbols-outlined text-2xl mb-0.5 ${isActive ? 'filled' : ''}`}>
                                        {card.icon}
                                    </span>
                                    <span className="text-[10px] font-medium leading-none">
                                        {card.title.replace('Live ', '').replace('Engine', '').replace('Sequence ', '')}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )
            }
        </div >
    );
};

export default AdminMarketingFunnelsPanel;
