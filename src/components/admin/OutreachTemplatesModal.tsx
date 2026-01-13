import React, { useState } from 'react';

interface OutreachTemplatesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type TemplateCategory = 'cold' | 'followup' | 'broker';

const TEMPLATES = {
    cold: [
        {
            title: 'Recruitment - The Reality Check',
            subject: 'Is your pipeline leaking?',
            body: `Hi {{agent.first_name}},

The market isn't what it was two years ago. Every buyer is gold.

If a warm lead texts you about a listing while you're at dinner, and you don't reply for 2 hours... they're gone.

Our AI replies in 5 seconds. 24/7. It answers questions, handles objections, and books appointments.

Don't let the next commission slip through your fingers.`
        },
        {
            title: 'Recruitment - ROI Math',
            subject: 'Quick math: $69 vs $15k',
            body: `Quick math {{agent.first_name}}:

One closed deal = $15k commission.
Our AI Sidekick = $69/mo.

If it saves you just ONE deal a year, it paid for itself for the next 20 years.

Ready to stop losing money?`
        }
    ],
    followup: [
        {
            title: 'Lead - Still looking?',
            subject: 'Quick question about your search',
            body: `Hi {{lead.first_name}},

Are you still looking for a home in {{lead.city}}, or have you put your search on hold?

I have a few off-market opportunities that might fit what you're looking for.`
        },
        {
            title: 'Lead - Price Drop Alert',
            subject: 'Price improvement on {{property.address}}',
            body: `Hi {{lead.first_name}},

Just wanted to let you know that {{property.address}} just improved its price.

It's now listed at {{property.price}}. Given your interest, I thought you'd want to know first.

Want to take another look?`
        }
    ],
    broker: [
        {
            title: 'Broker - Partnership Intro',
            subject: 'Collaboration opportunity',
            body: `Hi {{broker.name}},

I'm an admin at HomeListingAI, helping agents scale their business.

We're looking for forward-thinking brokerages to partner with. Our AI tools help agents close 3x more deals by automating the busy work.

Do you have 10 minutes next week to chat about a volume discount for your team?`
        }
    ]
};

const OutreachTemplatesModal: React.FC<OutreachTemplatesModalProps> = ({ isOpen, onClose }) => {
    const [category, setCategory] = useState<TemplateCategory>('cold');

    if (!isOpen) return null;

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Template copied to clipboard!');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full flex flex-col h-[600px] overflow-hidden">
                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-64 bg-slate-50 border-r border-slate-200 p-4 flex flex-col gap-2">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Categories</h3>

                        <button
                            onClick={() => setCategory('cold')}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${category === 'cold' ? 'bg-white shadow-sm text-indigo-600 ring-1 ring-slate-200' : 'text-slate-600 hover:bg-slate-100'}`}
                        >
                            <span className="material-symbols-outlined text-[20px]">ac_unit</span>
                            Cold Outreach
                        </button>
                        <button
                            onClick={() => setCategory('followup')}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${category === 'followup' ? 'bg-white shadow-sm text-indigo-600 ring-1 ring-slate-200' : 'text-slate-600 hover:bg-slate-100'}`}
                        >
                            <span className="material-symbols-outlined text-[20px]">history</span>
                            Follow-Up
                        </button>
                        <button
                            onClick={() => setCategory('broker')}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${category === 'broker' ? 'bg-white shadow-sm text-indigo-600 ring-1 ring-slate-200' : 'text-slate-600 hover:bg-slate-100'}`}
                        >
                            <span className="material-symbols-outlined text-[20px]">handshake</span>
                            Broker Collab
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-8 overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">
                                    {category === 'cold' && 'Cold Outreach Templates'}
                                    {category === 'followup' && 'Follow-Up Scripts'}
                                    {category === 'broker' && 'Broker Templates'}
                                </h2>
                                <p className="text-slate-500 text-sm mt-1">
                                    Proven templates to engage and convert. Click copy to use in your external email tool or funnels.
                                </p>
                            </div>
                            <button onClick={onClose} className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-full transition">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            {TEMPLATES[category].map((template, idx) => (
                                <div key={idx} className="border border-slate-200 rounded-xl p-5 hover:border-indigo-200 transition bg-white group shadow-sm">
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="font-semibold text-slate-900">{template.title}</h3>
                                        <button
                                            onClick={() => copyToClipboard(`Subject: ${template.subject}\n\n${template.body}`)}
                                            className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition"
                                        >
                                            <span className="material-symbols-outlined text-base">content_copy</span>
                                            Copy
                                        </button>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600 font-mono mb-3 border border-slate-100">
                                        Subject: {template.subject}
                                    </div>
                                    <div className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed relative">
                                        {template.body}
                                        {/* Overlay for long text? No, assume reasonable length */}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OutreachTemplatesModal;
