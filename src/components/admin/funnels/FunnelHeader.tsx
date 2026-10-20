import React from 'react';

interface Props {
    title: string;
    subtitle: string;
    availableFunnels: Record<string, unknown>;
    selectedFunnelId: string;
    onSelectFunnel: (id: string) => void;
    savedFunnelKeys: string[];
    showFunnelActions: boolean;
    isAnalyticsOpen: boolean;
    onOpenAnalytics: () => void;
    onCloseAnalytics: () => void;
    onImportLeads: () => void;
    onOpenEmailLibrary: () => void;
}

// Page title, funnel picker and the main buttons.
const FunnelHeader: React.FC<Props> = ({ title, subtitle, availableFunnels, selectedFunnelId, onSelectFunnel, savedFunnelKeys, showFunnelActions, isAnalyticsOpen, onOpenAnalytics, onCloseAnalytics, onImportLeads, onOpenEmailLibrary }) => (
    <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between px-4 md:px-0">
        <div className="space-y-2">
            <p className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                <span className="material-symbols-outlined text-base">monitoring</span>
                AI Funnel
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
                {Object.keys(availableFunnels).length > 0 && (
                    <div className="relative">
                        <select
                            value={selectedFunnelId}
                            onChange={(e) => onSelectFunnel(e.target.value)}
                            className="appearance-none bg-white border border-slate-300 text-slate-700 font-semibold py-2 pl-4 pr-10 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer text-sm"
                        >
                            {/* Cleanup: Only showing Realtor/Broker funnels as requested */}
                            {Object.keys(availableFunnels)
                                .map(key => (
                                    <option key={key} value={key}>
                                        {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}
                                    </option>
                                ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                            <span className="material-symbols-outlined text-xl">expand_more</span>
                        </div>
                    </div>
                )}
            </div>
            <p className="text-sm text-slate-500 sm:text-base">
                {subtitle}
            </p>
            {selectedFunnelId && !savedFunnelKeys.includes(selectedFunnelId) && (
                <p role="status" className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    This is a starter you have not saved. Read it, change anything you like, then press Save. Nothing is sent until you do.
                </p>
            )}
        </div>
        {showFunnelActions && (
            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => onImportLeads()}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                >
                    <span className="material-symbols-outlined text-base">upload_file</span>
                    Import Leads
                </button>
                <button
                    type="button"
                    onClick={() => onOpenEmailLibrary()}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-white border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                    <span className="material-symbols-outlined text-base">outgoing_mail</span>
                    Email Library
                </button>
                <button
                    onClick={() => onOpenAnalytics()}
                    className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-100 shadow-sm transition-colors"
                >
                    <span className="material-symbols-outlined">analytics</span>
                    View Scoring & Analytics
                </button>
            </div>
        )}

        {isAnalyticsOpen && (
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => onCloseAnalytics()}
                    className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-50 shadow-sm transition-colors"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                    Back to Funnel
                </button>
            </div>
        )}
    </header>
);

export default FunnelHeader;
