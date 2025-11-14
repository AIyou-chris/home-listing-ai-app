import React from 'react';

type SequenceSnapshot = {
    id: string;
    name: string;
    goal: string;
    replyRate: number;
    openRate: number;
    meetings: number;
    trend: 'up' | 'flat' | 'down';
    lastAdjust: string;
    bestStep: string;
};

type StepInsight = {
    id: string;
    label: string;
    channel: string;
    replyRate: number;
    conversionRate: number;
    avgResponseMinutes: number;
    tags: string[];
};

const sequenceSnapshots: SequenceSnapshot[] = [
    {
        id: 'welcome',
        name: 'Universal Welcome Drip',
        goal: 'Capture intent in first 48h',
        replyRate: 42,
        openRate: 68,
        meetings: 19,
        trend: 'up',
        lastAdjust: '2 days ago',
        bestStep: 'Day 1 Check-In'
    },
    {
        id: 'buyer',
        name: 'Homebuyer Journey',
        goal: 'Move buyers to tour requests',
        replyRate: 36,
        openRate: 62,
        meetings: 27,
        trend: 'flat',
        lastAdjust: '5 days ago',
        bestStep: 'Curated Matches'
    },
    {
        id: 'listing',
        name: 'AI-Powered Seller Funnel',
        goal: 'Convert CMAs to listings',
        replyRate: 31,
        openRate: 55,
        meetings: 11,
        trend: 'up',
        lastAdjust: 'Yesterday',
        bestStep: 'Interactive Listing Draft'
    },
    {
        id: 'post',
        name: 'After-Showing Follow-Up',
        goal: 'Secure second tours',
        replyRate: 24,
        openRate: 51,
        meetings: 14,
        trend: 'down',
        lastAdjust: '9 days ago',
        bestStep: 'Comparables Drop'
    }
];

const stepInsights: StepInsight[] = [
    {
        id: 'matches',
        label: 'Curated Matches',
        channel: 'AI Email',
        replyRate: 48,
        conversionRate: 19,
        avgResponseMinutes: 34,
        tags: ['buyer journey', 'personalized']
    },
    {
        id: 'listing-preview',
        label: 'Interactive Listing Draft',
        channel: 'AI Builder',
        replyRate: 37,
        conversionRate: 26,
        avgResponseMinutes: 47,
        tags: ['seller funnel', 'ai narrative']
    },
    {
        id: 'post-feedback',
        label: 'Feedback Pulse SMS',
        channel: 'Survey',
        replyRate: 29,
        conversionRate: 12,
        avgResponseMinutes: 21,
        tags: ['post showing', 'survey']
    },
    {
        id: 'task-call',
        label: 'Agent Task: Live Call',
        channel: 'Task',
        replyRate: 61,
        conversionRate: 33,
        avgResponseMinutes: 12,
        tags: ['human touch']
    }
];

const TrendIcon: React.FC<{ trend: SequenceSnapshot['trend'] }> = ({ trend }) => {
    const icon = trend === 'up' ? 'trending_up' : trend === 'down' ? 'trending_down' : 'trending_flat';
    const color =
        trend === 'up' ? 'text-emerald-600 bg-emerald-50' : trend === 'down' ? 'text-rose-600 bg-rose-50' : 'text-slate-500 bg-slate-100';
    return (
        <span className={`material-symbols-outlined text-base rounded-full px-2 py-1 text-xs font-semibold ${color}`}>
            {icon}
        </span>
    );
};

const SequenceFeedbackPanel: React.FC = () => {
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Top Performing Step</p>
                    <h3 className="mt-2 text-lg font-bold text-slate-900">Curated Matches</h3>
                    <p className="text-sm text-slate-500">48% reply rate • 19% tour conversion</p>
                    <div className="mt-4 h-2 rounded-full bg-slate-100">
                        <div className="h-2 w-3/4 rounded-full bg-blue-500" />
                    </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sequences Needing Love</p>
                    <h3 className="mt-2 text-lg font-bold text-slate-900">After-Showing Follow-Up</h3>
                    <p className="text-sm text-rose-600">Reply rate trending down 6% week over week.</p>
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600">
                        <span className="material-symbols-outlined text-base">warning</span>
                        Review Step 3 copy
                    </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fastest Replies</p>
                    <h3 className="mt-2 text-lg font-bold text-slate-900">Agent Task: Live Call</h3>
                    <p className="text-sm text-slate-500">Average reply in 12 minutes once you log a call touch.</p>
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        <span className="material-symbols-outlined text-base">call</span>
                        Keep human touches in the mix
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Sequence Overview</p>
                        <h3 className="text-2xl font-bold text-slate-900">Health & Reply Rates</h3>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">Rolling 14 day window</span>
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {sequenceSnapshots.map((sequence) => (
                        <article key={sequence.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h4 className="text-base font-semibold text-slate-900">{sequence.name}</h4>
                                    <p className="text-xs uppercase tracking-wide text-slate-500">{sequence.goal}</p>
                                </div>
                                <TrendIcon trend={sequence.trend} />
                            </div>
                            <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
                                <div className="rounded-lg bg-white p-3 shadow-sm">
                                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Replies</dt>
                                    <dd className="text-lg font-bold text-slate-900">{sequence.replyRate}%</dd>
                                </div>
                                <div className="rounded-lg bg-white p-3 shadow-sm">
                                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Opens</dt>
                                    <dd className="text-lg font-bold text-slate-900">{sequence.openRate}%</dd>
                                </div>
                                <div className="rounded-lg bg-white p-3 shadow-sm">
                                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Meetings</dt>
                                    <dd className="text-lg font-bold text-slate-900">{sequence.meetings}</dd>
                                </div>
                            </dl>
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 font-semibold text-slate-600">
                                    <span className="material-symbols-outlined text-base text-primary-500">auto_awesome</span>
                                    Wins: {sequence.bestStep}
                                </span>
                                <span>Last adjusted {sequence.lastAdjust}</span>
                            </div>
                        </article>
                    ))}
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Step Performance</p>
                        <h3 className="text-2xl font-bold text-slate-900">Where Replies Spike</h3>
                    </div>
                    <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        <span className="material-symbols-outlined text-base">download</span>
                        Export Report
                    </button>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {stepInsights.map((step) => (
                        <article key={step.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{step.channel}</p>
                                    <h4 className="text-lg font-semibold text-slate-900">{step.label}</h4>
                                </div>
                                <span className="material-symbols-outlined text-base text-slate-400">bar_chart</span>
                            </div>
                            <div className="mt-4 space-y-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reply Rate</p>
                                    <div className="mt-1 flex items-center gap-3">
                                        <div className="h-2 flex-1 rounded-full bg-white">
                                            <div className="h-2 rounded-full bg-blue-500" style={{ width: `${step.replyRate}%` }} />
                                        </div>
                                        <span className="text-sm font-semibold text-slate-900">{step.replyRate}%</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-center text-xs text-slate-500">
                                    <div className="rounded-lg bg-white p-3 shadow-sm">
                                        <p className="font-semibold text-slate-600">Conversions</p>
                                        <p className="text-lg font-bold text-slate-900">{step.conversionRate}%</p>
                                    </div>
                                    <div className="rounded-lg bg-white p-3 shadow-sm">
                                        <p className="font-semibold text-slate-600">Avg Response</p>
                                        <p className="text-lg font-bold text-slate-900">{step.avgResponseMinutes}m</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    {step.tags.map((tag) => (
                                        <span key={`${step.id}-${tag}`} className="rounded-full bg-white px-2 py-1 text-slate-600">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SequenceFeedbackPanel;
