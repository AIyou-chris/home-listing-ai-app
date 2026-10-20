import React from 'react';
import type { FunnelStepCardProps } from './FunnelStepCard';

export type StepWaitEditorProps = Pick<FunnelStepCardProps, 'onSave'>;

// A pause step.
const StepWaitEditor: React.FC<StepWaitEditorProps> = ({ onSave }) => (
    <div className="space-y-4">
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-slate-200 text-slate-600 rounded-lg">
                    <span className="material-symbols-outlined">hourglass_empty</span>
                </div>
                <div>
                    <h4 className="text-sm font-bold text-slate-900">Wait Step</h4>
                    <p className="text-xs text-slate-500">Pause the sequence for a specific time.</p>
                </div>
            </div>

            <div className="p-4 bg-white rounded-lg border border-slate-200 text-sm text-slate-600">
                Please use the <strong>Timing</strong> dropdown at the top of this card to set the wait duration.
            </div>

            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-200">
                <button
                    onClick={onSave}
                    className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold shadow-md hover:bg-slate-900"
                >
                    Save Changes
                </button>
            </div>
        </div>
    </div>
);

export default StepWaitEditor;
