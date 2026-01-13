import React from 'react';

interface CallScriptSelectorProps {
    onSelect: (script: string, subject: string) => void;
}

export const CallScriptSelector: React.FC<CallScriptSelectorProps> = ({ onSelect }) => {
    const templates = [
        {
            id: 'speed-to-lead',
            label: '🚀 Speed-to-Lead (The Money Maker)',
            description: 'Immediate response to new leads. Filters tire-kickers.',
            subject: 'Quick question about your search',
            script: "Hi, this is {{agent.first_name}}'s assistant. I saw you just looked at the property at {{lead.last_viewed_address}}. Are you looking to buy with cash or do you need financing?"
        },
        {
            id: 'feedback',
            label: '🏠 Post-Showing Feedback',
            description: 'Gather insights 2 hours after a showing.',
            subject: 'Feedback on the viewing',
            script: "Hi {{lead.first_name}}, thanks for viewing the property today. Quick question: What did you think of the price compared to other homes you've seen?"
        },
        {
            id: 'confirmation',
            label: '📅 Appointment Confirmation',
            description: 'Prevent no-shows 24h before meeting.',
            subject: 'Confirming our meeting',
            script: "Hi {{lead.first_name}}, just confirming our meeting with {{agent.first_name}} for tomorrow at 2 PM. Please press 1 to confirm you can still make it."
        }
    ];

    return (
        <div className="mb-6 bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                ⚡️ High-Impact Voice Templates
            </h3>
            <div className="grid grid-cols-1 gap-2">
                {templates.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => onSelect(t.script, t.subject)}
                        className="flex items-start text-left p-3 bg-white border border-slate-200 rounded hover:border-violet-500 hover:ring-1 hover:ring-violet-500 transition-all group"
                    >
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-700 group-hover:text-violet-700">
                                    {t.label}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>
                        </div>
                        <span className="text-xs font-bold text-violet-600 opacity-0 group-hover:opacity-100 transition-opacity self-center">
                            Use
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
};
