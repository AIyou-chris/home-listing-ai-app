import React from 'react';
import type { FunnelStepCardProps } from './FunnelStepCard';

export type StepTaskEditorProps = Pick<FunnelStepCardProps, 'step' | 'onUpdateStep' | 'onSave'>;

// A task for a person.
const StepTaskEditor: React.FC<StepTaskEditorProps> = ({ step, onUpdateStep, onSave }) => (
    <div className="space-y-4">
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-5">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                    <span className="material-symbols-outlined">assignment_turned_in</span>
                </div>
                <div>
                    <h4 className="text-sm font-bold text-emerald-900">Agent Task</h4>
                    <p className="text-xs text-emerald-700/80">A dedicated reminder for you to take action.</p>
                </div>
            </div>

            <label className="block text-xs font-semibold text-emerald-800 mb-1">
                Task Title
            </label>
            <input
                className="w-full text-sm font-bold text-slate-900 placeholder:text-slate-400 border-emerald-200 rounded-lg p-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white mb-3"
                placeholder="e.g. Call Lead..."
                value={step.subject}
                onChange={(e) => onUpdateStep(step.id, 'subject', e.target.value)}
            />

            <label className="block text-xs font-semibold text-emerald-800 mb-1">
                Instructions / Details
            </label>
            <textarea
                className="w-full h-24 rounded-lg border-emerald-200 bg-white p-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-sm"
                placeholder="Describe what needs to be done..."
                value={step.content}
                onChange={(e) => onUpdateStep(step.id, 'content', e.target.value)}
            />

            <div className="mt-4">
                <label className="block text-[10px] uppercase font-bold text-emerald-600/70 mb-2 tracking-wide">
                    Quick Ideas
                </label>
                <div className="flex flex-wrap gap-2">
                    {[
                        { emoji: '📞', label: 'Call Lead', title: 'Call Lead', desc: 'Call {{lead.name}} and ask about their timeline.' },
                        { emoji: '📝', label: 'Personal Note', title: 'Send Handwritten Note', desc: 'Write a personal card thanking {{lead.name}}.' },
                        { emoji: '📊', label: 'Prepare CMA', title: 'Prepare CMA', desc: 'Run comps for {{lead.interestAddress}} and send video review.' },
                        { emoji: '🤝', label: 'Social Connect', title: 'Connect on Social', desc: 'Find {{lead.name}} on LinkedIn/IG and follow up.' }
                    ].map((idea) => (
                        <button
                            key={idea.label}
                            onClick={() => {
                                onUpdateStep(step.id, 'subject', idea.title);
                                onUpdateStep(step.id, 'content', idea.desc);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-200 rounded-full text-xs font-semibold text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 transition-all hover:scale-105 shadow-sm"
                        >
                            <span>{idea.emoji}</span>
                            {idea.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-emerald-200/50">
                <button
                    onClick={onSave}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-emerald-700"
                >
                    Save Changes
                </button>
            </div>
        </div>
    </div>
);

export default StepTaskEditor;
