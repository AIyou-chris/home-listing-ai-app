import React from 'react';
import { EmailEditor } from '../../EmailEditor';
import type { FunnelStepCardProps } from './FunnelStepCard';

export type StepEmailEditorProps = Pick<FunnelStepCardProps, 'step' | 'onUpdateStep' | 'onSave' | 'saveStatus' | 'sendSuccessIds' | 'sendingTestId' | 'onSendTest'>;

// An email step with the editor and live preview.
const StepEmailEditor: React.FC<StepEmailEditorProps> = ({ step, onUpdateStep, onSave, saveStatus, sendSuccessIds, sendingTestId, onSendTest }) => (
    <div className="space-y-4">
        <div className="rounded-xl bg-violet-50 border border-violet-100 p-5">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-violet-100 text-violet-600 rounded-lg">
                    <span className="material-symbols-outlined">mail</span>
                </div>
                <div>
                    <h4 className="text-sm font-bold text-violet-900">Email Content</h4>
                    <p className="text-xs text-violet-700/80">Design your automated email message.</p>
                </div>
            </div>

            <label className="block text-xs font-semibold text-violet-800/90 mb-1">
                Subject Line
            </label>
            <input
                className="w-full text-base font-bold text-slate-900 placeholder:text-slate-300 border border-violet-200 rounded-lg p-3 focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white shadow-sm mb-4"
                placeholder="e.g. following up on our chat..."
                value={step.subject}
                onChange={(e) => onUpdateStep(step.id, 'subject', e.target.value)}
            />

            <label className="block text-xs font-semibold text-violet-800/90 mb-1">
                Preview Text <span className="text-violet-400 font-normal">(Preheader)</span>
            </label>
            <input
                className="w-full text-sm text-slate-700 placeholder:text-slate-300 border border-violet-200 rounded-lg p-2.5 focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white shadow-sm mb-4"
                placeholder="Short summary shown in inbox list view..."
                value={step.previewText || ''}
                onChange={(e) => onUpdateStep(step.id, 'previewText', e.target.value)}
            />

            <div className="relative">
                <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-violet-800/90">Message Body</label>
                    <div className="flex items-center gap-4">
                        {/* Compliance Toggle */}
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={step.includeUnsubscribe !== false}
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                onChange={(e) => onUpdateStep(step.id, 'includeUnsubscribe', (e.target.checked as any))}
                            />
                            <div className={`w-8 h-4 rounded-full transition-colors relative ${step.includeUnsubscribe !== false ? 'bg-violet-600' : 'bg-slate-300'}`}>
                                <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${step.includeUnsubscribe !== false ? 'translate-x-4' : 'translate-x-0'}`} />
                            </div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-violet-600 transition-colors">
                                Unsubscribe Footer
                            </span>
                        </label>
                        <button
                            type="button"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[10px] font-bold shadow-sm hover:shadow-md transition-all hover:scale-105"
                        >
                            <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                            AI Magic
                        </button>
                    </div>
                </div>
                <div className="relative border border-violet-200 rounded-lg overflow-hidden shadow-sm bg-white">
                    {saveStatus === 'success' && (
                        <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-300">
                            <div className="flex flex-col items-center gap-2 bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-xl transform scale-100 animate-in zoom-in-50 duration-300">
                                <span className="material-symbols-outlined text-3xl">check_circle</span>
                                <span className="font-bold text-lg">Saved!</span>
                            </div>
                        </div>
                    )}
                    <EmailEditor
                        value={step.content}
                        onChange={(val) => onUpdateStep(step.id, 'content', val)}
                        placeholder="Type your message..."
                        className="min-h-[300px]"
                    />
                </div>
                <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-violet-200/50">
                    {sendSuccessIds.includes(step.id) ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold animate-in zoom-in spin-in-3 duration-300">
                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                            Sent!
                        </span>
                    ) : (
                        <button
                            onClick={() => onSendTest(step)}
                            disabled={sendingTestId === step.id}
                            className="px-3 py-1.5 bg-white border border-violet-200 rounded-lg text-xs font-semibold text-violet-700 hover:bg-violet-50 shadow-sm disabled:opacity-50"
                        >
                            {sendingTestId === step.id ? 'Sending...' : 'Send Test'}
                        </button>
                    )}
                    <button
                        onClick={onSave}
                        disabled={saveStatus === 'saving' || saveStatus === 'success'}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-md transition-all duration-200 ${saveStatus === 'success'
                            ? 'bg-emerald-500 text-white scale-105'
                            : saveStatus === 'saving'
                                ? 'bg-violet-400 cursor-not-allowed'
                                : 'bg-violet-600 hover:bg-violet-700 text-white'
                            }`}
                    >
                        {saveStatus === 'saving' ? (
                            <span className="flex items-center gap-1">
                                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Saving...
                            </span>
                        ) : saveStatus === 'success' ? (
                            <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">check</span>
                                Saved!
                            </span>
                        ) : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    </div>
);

export default StepEmailEditor;
