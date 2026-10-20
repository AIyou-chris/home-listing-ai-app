import React from 'react';
import type { FunnelStepCardProps } from './FunnelStepCard';

export type StepTextEditorProps = Pick<FunnelStepCardProps, 'step' | 'onUpdateStep' | 'onSave' | 'mergeTokens' | 'sampleMergeData' | 'onSendTest'>;

// A text message step with a phone preview.
const StepTextEditor: React.FC<StepTextEditorProps> = ({ step, onUpdateStep, onSave, mergeTokens, sampleMergeData, onSendTest }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Left: Editor */}
        <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-slate-500">sms</span>
                    <h4 className="text-sm font-bold text-slate-700">SMS Message</h4>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                    This is the exact text your lead will get. Keep it short, personal, and easy to reply to.
                </p>

                <textarea
                    className="w-full h-32 rounded-lg border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm resize-none"
                    placeholder="Type your text message here... (e.g. Hi {{lead.name}})"
                    value={step.content}
                    onChange={(e) => onUpdateStep(step.id, 'content', e.target.value)}
                />
                <div className="flex justify-between items-center mt-1">
                    <span className="text-[10px] text-slate-400">
                        {step.content?.length || 0} characters
                    </span>
                </div>
                <div className="mt-3">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Attach Image URL (MMS)
                    </label>
                    <div className="flex gap-2">
                        <input
                            className="flex-1 rounded-lg border-slate-200 text-xs text-slate-700 bg-white"
                            placeholder="https://..."
                            value={step.mediaUrl || ''}
                            onChange={(e) => onUpdateStep(step.id, 'mediaUrl', e.target.value)}
                        />
                        {step.mediaUrl && <div className="w-8 h-8 rounded bg-slate-100 bg-cover bg-center border border-slate-200 shrink-0" style={{ backgroundImage: `url(${step.mediaUrl})` }}></div>}
                    </div>
                </div>

                <div className="mt-4 rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700">Compliance Line</label>
                            <p className="text-[11px] text-slate-500">Adds “Reply STOP to unsubscribe” to test sends and live sends.</p>
                        </div>
                        {/* Compliance Toggle */}
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={step.includeUnsubscribe !== false}
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                onChange={(e) => onUpdateStep(step.id, 'includeUnsubscribe', e.target.checked as any)}
                            />
                            <div className={`w-8 h-4 rounded-full transition-colors relative ${step.includeUnsubscribe !== false ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                                <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${step.includeUnsubscribe !== false ? 'translate-x-4' : 'translate-x-0'}`} />
                            </div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-indigo-500 transition-colors">
                                Include STOP
                            </span>
                        </label>
                    </div>
                </div>

                <p className="text-xs text-slate-400 mt-3">
                    Tokens like <code className="bg-slate-200 px-1 rounded text-slate-600">{'{{lead.name}}'}</code> are supported.
                </p>

                <div className="flex items-center justify-end gap-2 mt-4 pt-2 border-t border-slate-200">
                    <button
                        onClick={() => onSendTest(step)}
                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm"
                    >
                        Send Test SMS
                    </button>
                    <button
                        onClick={onSave}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-indigo-700"
                    >
                        Save SMS Step
                    </button>
                </div>
            </div>
        </div>

        {/* Right: Phone Preview (WYSIWYG) */}
        <div className="flex flex-col items-center">
            <h4 className="text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-wider">Lead's Phone Preview</h4>
            <div className="relative w-[280px] h-[500px] bg-slate-900 rounded-[3rem] shadow-2xl p-3 ring-4 ring-slate-100">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-xl z-20"></div>
                <div className="w-full h-full bg-slate-50 rounded-[2.2rem] overflow-hidden flex flex-col relative z-10">
                    {/* Status Bar */}
                    <div className="h-10 w-full bg-slate-100/80 backdrop-blur flex justify-between items-end px-6 pb-2 text-[10px] font-bold text-slate-900">
                        <span>9:41</span>
                        <div className="flex gap-1">
                            <span className="material-symbols-outlined text-[12px]">signal_cellular_alt</span>
                            <span className="material-symbols-outlined text-[12px]">wifi</span>
                            <span className="material-symbols-outlined text-[12px]">battery_full</span>
                        </div>
                    </div>

                    {/* Header */}
                    <div className="h-12 border-b border-slate-200 bg-slate-50/80 backdrop-blur flex flex-col items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] text-indigo-700 font-bold mb-0.5">
                            {sampleMergeData.agent.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium">{sampleMergeData.agent.name}</span>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-white">
                        <div className="text-[10px] text-center text-slate-400 font-medium">Today 9:41 AM</div>

                        {step.mediaUrl && (
                            <div className="flex justify-end">
                                <div className="bg-blue-500 p-1 rounded-2xl rounded-tr-sm max-w-[85%] shadow-sm">
                                    <img src={step.mediaUrl} alt="MMS" className="rounded-xl w-full h-auto object-cover" />
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end">
                            <div className="bg-blue-500 text-white rounded-2xl rounded-tr-sm px-3 py-2 max-w-[85%] text-xs leading-relaxed shadow-sm">
                                <span className="whitespace-pre-wrap">
                                    {mergeTokens(step.content || '') || <span className="opacity-50 italic">Typing...</span>}
                                    {step.includeUnsubscribe !== false ? '\n\nReply STOP to unsubscribe.' : ''}
                                </span>
                            </div>
                        </div>

                        {/* Delivery Status */}
                        <div className="flex justify-end">
                            <span className="text-[9px] text-slate-400 font-medium">Delivered</span>
                        </div>
                    </div>

                    {/* Input Area (Mock) */}
                    <div className="h-12 border-t border-slate-200 bg-slate-50 px-2 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-400">
                            <span className="material-symbols-outlined text-[14px]">add</span>
                        </div>
                        <div className="flex-1 h-8 rounded-full border border-slate-300 bg-white"></div>
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white">
                            <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

export default StepTextEditor;
