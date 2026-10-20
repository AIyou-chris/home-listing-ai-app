import React from 'react';
import type { FunnelStepCardProps } from './FunnelStepCard';

export type StepCallEditorProps = Pick<FunnelStepCardProps, 'step' | 'onUpdateStep' | 'testPhone' | 'isSavingBot' | 'getBotOptions' | 'resolveCallBotIdForStep' | 'handleCreateCallBot' | 'handleEditCallBot' | 'handleDeleteCallBot' | 'onSendTest'>;

// A call step: pick which AI call bot phones the lead.
const StepCallEditor: React.FC<StepCallEditorProps> = ({ step, onUpdateStep, testPhone, isSavingBot, getBotOptions, resolveCallBotIdForStep, handleCreateCallBot, handleEditCallBot, handleDeleteCallBot, onSendTest }) => (
    <div className="space-y-4">
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-6 flex items-start gap-4">
            <div className="p-3 bg-white rounded-full shadow-sm text-blue-600">
                <span className="material-symbols-outlined text-2xl">support_agent</span>
            </div>
            <div>
                <h4 className="text-blue-900 font-bold text-lg mb-1">AI Call Configured</h4>
                <p className="text-blue-700/80 text-sm leading-relaxed max-w-md">
                    This call step uses a prebuilt call bot profile. Script editing is disabled here to keep behavior stable.
                </p>
            </div>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 p-4 space-y-4">
            <div>
                <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                        Assistant Profile
                    </label>
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                        Provider Managed
                    </span>
                </div>
                <select
                    className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    value={resolveCallBotIdForStep(step.content)}
                    onChange={(e) => onUpdateStep(step.id, 'content', e.target.value)}
                >
                    {getBotOptions().map((bot) => (
                        <option key={bot.key} value={bot.key}>
                            {bot.name}
                        </option>
                    ))}
                </select>
                <div className="flex justify-between items-start mt-1.5">
                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[10px]">info</span>
                        Edit the prompt/script in your provider config, not in this funnel step.
                    </p>
                    <span className="text-[10px] text-slate-400">
                        {getBotOptions().find((bot) => bot.key === resolveCallBotIdForStep(step.content))?.configId}
                    </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={handleCreateCallBot}
                        disabled={isSavingBot}
                        className="text-[11px] px-2.5 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                    >
                        + New Bot
                    </button>
                    {(() => {
                        const selectedBot = getBotOptions().find((bot) => bot.key === resolveCallBotIdForStep(step.content));
                        if (!selectedBot) return null;
                        return (
                            <>
                                <button
                                    type="button"
                                    onClick={() => handleEditCallBot(selectedBot)}
                                    disabled={isSavingBot}
                                    className="text-[11px] px-2.5 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                                >
                                    Edit Bot
                                </button>
                                {!selectedBot.isSystem && (
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteCallBot(selectedBot)}
                                        disabled={isSavingBot}
                                        className="text-[11px] px-2.5 py-1 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                                    >
                                        Delete Bot
                                    </button>
                                )}
                            </>
                        );
                    })()}
                </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <div className="text-xs text-slate-500 font-medium">
                    <span className="font-bold text-slate-700">Test Number:</span> {testPhone || 'Not set'}
                </div>
                <button
                    onClick={() => onSendTest(step)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 border border-indigo-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-indigo-700 hover:shadow-lg transition-all active:scale-95"
                >
                    <span className="material-symbols-outlined text-sm">record_voice_over</span>
                    Test AI Call
                </button>
            </div>
        </div>
    </div>
);

export default StepCallEditor;
