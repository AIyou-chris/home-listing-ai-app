import React from 'react';
import { CallBot, EditableStep } from '../../../types';
import { COMMON_TOKEN_HINTS } from './funnelDefaults';
import FunnelStepCard from './FunnelStepCard';

export interface FunnelStepsPanelProps {
    badgeIcon: string;
    badgeClassName: string;
    badgeLabel: string;
    title: string;
    description: string;
    steps: EditableStep[];
    expandedIds: string[];
    onToggleStep: (id: string) => void;
    onUpdateStep: (id: string, field: keyof EditableStep, value: string) => void;
    onRemoveStep: (id: string) => void;
    onAddStep: () => void;
    onSave: () => void;
    saveLabel: string;
    onSendTest: (step: EditableStep) => void;
}

// What the editor needs from the page around it (state it shows and actions it can start).
export interface FunnelStepsContext {
    isLoading: boolean;
    panelExpanded: boolean;
    togglePanel: () => void;
    saveStatus: 'idle' | 'saving' | 'success' | 'error';
    sendSuccessIds: string[];
    sendingTestId: string | null;
    testPhone: string;
    isSavingBot: boolean;
    getBotOptions: () => CallBot[];
    resolveCallBotIdForStep: (value?: string) => string;
    handleCreateCallBot: () => void | Promise<void>;
    handleEditCallBot: (bot: CallBot) => void | Promise<void>;
    handleDeleteCallBot: (bot: CallBot) => void | Promise<void>;
    mergeTokens: (template: string) => string;
    sampleMergeData: { agent: Record<string, string>; lead: Record<string, string> };
}

// The step-by-step editor for one funnel: every email, text or call, its delay and its words.
const FunnelStepsPanel: React.FC<FunnelStepsPanelProps & FunnelStepsContext> = ({
    badgeIcon, badgeClassName, badgeLabel, title, description, steps, expandedIds, onToggleStep, onUpdateStep, onRemoveStep, onAddStep, onSave, saveLabel, onSendTest,
    isLoading, panelExpanded, togglePanel, saveStatus, sendSuccessIds, sendingTestId, testPhone, isSavingBot, getBotOptions, resolveCallBotIdForStep,
    handleCreateCallBot, handleEditCallBot, handleDeleteCallBot, mergeTokens, sampleMergeData
}) => {
    const isOpen = panelExpanded;

    if (isLoading) {
        return (
            <section key="marketing-funnel-panel" className="bg-white border-y border-slate-200 md:border md:rounded-2xl shadow-sm p-6 space-y-6 min-h-[400px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="text-sm text-slate-500 font-medium">Loading funnel steps...</p>
                </div>
            </section>
        );
    }

    return (
        <section key="marketing-funnel-panel" className="bg-white border-y border-slate-200 md:border md:rounded-2xl shadow-sm p-6 space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                    <p className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${badgeClassName}`}>
                        <span className="material-symbols-outlined text-base">{badgeIcon}</span>
                        {badgeLabel}
                    </p>
                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
                        <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 self-start">

                    <button
                        type="button"
                        onClick={togglePanel}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-50"
                    >
                        <span className="material-symbols-outlined text-base">
                            {isOpen ? 'expand_less' : 'expand_more'}
                        </span>
                        {isOpen ? 'Collapse' : 'Expand'}
                    </button>
                </div>
            </div>
            {
                isOpen && (
                    <>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-wide text-slate-500">
                            <span className="font-semibold text-slate-600">Tokens:</span>
                            {COMMON_TOKEN_HINTS.map((token) => (
                                <span
                                    key={`token-${token}`}
                                    className="rounded-full bg-slate-100 px-2 py-1 text-slate-600"
                                >
                                    {token}
                                </span>
                            ))}
                        </div>
                        <div className="space-y-0 relative">
                            {steps.map((step, index) => (
                                <FunnelStepCard
                                    key={step.id}
                                    step={step}
                                    isLast={index === steps.length - 1}
                                    stepIsOpen={expandedIds.includes(step.id)}
                                    onToggleStep={onToggleStep}
                                    onUpdateStep={onUpdateStep}
                                    onRemoveStep={onRemoveStep}
                                    onSendTest={onSendTest}
                                    onSave={onSave}
                                    saveStatus={saveStatus}
                                    sendSuccessIds={sendSuccessIds}
                                    sendingTestId={sendingTestId}
                                    testPhone={testPhone}
                                    isSavingBot={isSavingBot}
                                    getBotOptions={getBotOptions}
                                    resolveCallBotIdForStep={resolveCallBotIdForStep}
                                    handleCreateCallBot={handleCreateCallBot}
                                    handleEditCallBot={handleEditCallBot}
                                    handleDeleteCallBot={handleDeleteCallBot}
                                    mergeTokens={mergeTokens}
                                    sampleMergeData={sampleMergeData}
                                />
                            ))}

                        </div >
                        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                            <button
                                type="button"
                                onClick={onAddStep}
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                <span className="material-symbols-outlined text-base">add</span>
                                Add Step
                            </button>
                            <button
                                type="button"
                                onClick={onSave}
                                disabled={saveStatus === 'saving' || saveStatus === 'success'}
                                className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 ${saveStatus === 'success'
                                    ? 'bg-emerald-500 scale-105'
                                    : saveStatus === 'saving'
                                        ? 'bg-primary-400 cursor-not-allowed'
                                        : 'bg-primary-600 hover:bg-primary-700'
                                    }`}
                            >
                                {saveStatus === 'saving' ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Saving...
                                    </>
                                ) : saveStatus === 'success' ? (
                                    <>
                                        <span className="material-symbols-outlined text-base">check_circle</span>
                                        Saved Successfully
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-base">save</span>
                                        {saveLabel}
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                )
            }
        </section >
    );
};

export default FunnelStepsPanel;
