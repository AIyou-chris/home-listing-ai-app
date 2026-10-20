import React from 'react';
import type { FunnelStepCardProps } from './FunnelStepCard';

export type StepConditionEditorProps = Pick<FunnelStepCardProps, 'step' | 'onUpdateStep' | 'onSave'>;

// An if/then branch step.
const StepConditionEditor: React.FC<StepConditionEditorProps> = ({ step, onUpdateStep, onSave }) => (
    <div className="space-y-4">
        <div className="rounded-xl bg-amber-50 border border-amber-100 p-5">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                    <span className="material-symbols-outlined">alt_route</span>
                </div>
                <div>
                    <h4 className="text-sm font-bold text-amber-900">Logic Condition</h4>
                    <p className="text-xs text-amber-700/80">Branch the funnel based on lead behavior.</p>
                </div>
            </div>

            <label className="block text-xs font-semibold text-amber-800 mb-1">
                If this happens...
            </label>
            <select
                className="w-full text-sm font-bold text-slate-900 border-amber-200 rounded-lg p-2.5 focus:border-amber-500 bg-white mb-3"
                value={step.conditionRule || 'opened_email'}
                onChange={(e) => onUpdateStep(step.id, 'conditionRule', e.target.value)}
            >
                <option value="opened_email">Opened Previous Email</option>
                <option value="clicked_link">Clicked Link</option>
                <option value="replied">Replied to Email</option>
                <option value="no_reply">Did Not Reply</option>
                <option value="tag_added">Tag Added</option>
            </select>

            <label className="block text-xs font-semibold text-amber-800 mb-1">
                Value / Details (Optional)
            </label>
            <input
                className="w-full text-sm text-slate-900 border-amber-200 rounded-lg p-2.5 focus:border-amber-500 bg-white mb-3"
                placeholder="e.g. specific tag or link..."
                value={step.conditionValue || ''}
                onChange={(e) => onUpdateStep(step.id, 'conditionValue', e.target.value)}
            />

            <div className="mt-2 p-3 bg-white/50 rounded-lg border border-amber-100 text-xs text-amber-700 italic">
                Note: Advanced branching logic is maintained by the AI. This step acts as a marker for the decision point.
            </div>

            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-amber-200/50">
                <button
                    onClick={onSave}
                    className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-amber-700"
                >
                    Save Changes
                </button>
            </div>
        </div>
    </div>
);

export default StepConditionEditor;
