import React, { useEffect, useState, useCallback } from 'react';
import { feedbackService } from '../services/feedbackService';

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

const INITIAL_SNAPSHOTS: SequenceSnapshot[] = [
    {
        id: 'welcome',
        name: 'Universal Welcome Drip',
        goal: 'Capture intent in first 48h',
        replyRate: 0,
        openRate: 0,
        meetings: 0,
        trend: 'flat',
        lastAdjust: '2 days ago',
        bestStep: 'Day 1 Check-In'
    },
    {
        id: 'buyer',
        name: 'Homebuyer Journey',
        goal: 'Move buyers to tour requests',
        replyRate: 0,
        openRate: 0,
        meetings: 0,
        trend: 'flat',
        lastAdjust: '5 days ago',
        bestStep: 'Curated Matches'
    },
    {
        id: 'listing',
        name: 'AI-Powered Seller Funnel',
        goal: 'Convert CMAs to listings',
        replyRate: 0,
        openRate: 0,
        meetings: 0,
        trend: 'flat',
        lastAdjust: 'Yesterday',
        bestStep: 'Interactive Listing Draft'
    },
    {
        id: 'post',
        name: 'After-Showing Follow-Up',
        goal: 'Secure second tours',
        replyRate: 0,
        openRate: 0,
        meetings: 0,
        trend: 'flat',
        lastAdjust: '9 days ago',
        bestStep: 'Comparables Drop'
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

import { DEMO_SEQUENCE_SNAPSHOTS } from '../demoConstants';

const SequenceFeedbackPanel: React.FC<{ isDemoMode?: boolean; userId?: string }> = ({ isDemoMode = false, userId }) => {
    const [snapshots, setSnapshots] = useState<SequenceSnapshot[]>(INITIAL_SNAPSHOTS.map(s => ({ ...s, replyRate: 0, openRate: 0, meetings: 0, trend: 'flat', lastAdjust: 'Never', bestStep: 'None' })));
    const [stepInsights, setStepInsights] = useState<StepInsight[]>([]);
    const [loading, setLoading] = useState(true);

    const loadAnalytics = useCallback(async () => {
        setLoading(true);

        if (isDemoMode) {
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 800));
            setSnapshots(DEMO_SEQUENCE_SNAPSHOTS as unknown as SequenceSnapshot[]);
            setStepInsights([
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
            ]);
            setLoading(false);
            return;
        }

        if (!userId) {
            setLoading(false);
            return;
        }

        const [data, stepStats] = await Promise.all([
            feedbackService.fetchAnalytics(userId),
            feedbackService.fetchStepPerformance(userId)
        ]);

        const updatedSnapshots = INITIAL_SNAPSHOTS.map(snap => {
            const stats = data[snap.id] || { sent: 0, opened: 0, clicked: 0, replied: 0, bounced: 0 };
            const openRate = stats.sent > 0 ? Math.round((stats.opened / stats.sent) * 100) : 0;
            const replyRate = stats.sent > 0 ? Math.round((stats.clicked / stats.sent) * 100) : 0;

            return {
                ...snap,
                openRate,
                replyRate,
                meetings: 0, // Placeholder
                trend: 'flat' as const,
                lastAdjust: 'Never',
                bestStep: '-'
            };
        });

        setSnapshots(updatedSnapshots);

        if (stepStats && stepStats.length > 0) {
            const mappedInsights: StepInsight[] = stepStats.map(s => ({
                id: s.stepId,
                label: s.stepId, // In future, map this to funnel step name
                channel: 'Email',
                replyRate: s.sent > 0 ? Math.round((s.replied / s.sent) * 100) : 0,
                conversionRate: s.sent > 0 ? Math.round((s.clicked / s.sent) * 100) : 0,
                avgResponseMinutes: 0,
                tags: []
            }));
            // Sort by reply rate descending
            mappedInsights.sort((a, b) => b.replyRate - a.replyRate);
            setStepInsights(mappedInsights);
        } else {
            setStepInsights([]);
        }

        setLoading(false);
    }, [isDemoMode, userId]);

    useEffect(() => {
        loadAnalytics();
    }, [loadAnalytics]);

    return (
        <div className="space-y-8">
            {/* Top performing cards - Hide or show empty if no data */}
            {stepInsights.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Top Performing Step</p>
                        <h3 className="mt-2 text-lg font-bold text-slate-900">{stepInsights[0]?.label || '-'}</h3>
                        <p className="text-sm text-slate-500">{stepInsights[0]?.replyRate || 0}% reply rate</p>
                        <div className="mt-4 h-2 rounded-full bg-slate-100">
                            <div className="h-2 rounded-full bg-blue-500" style={{ width: `${stepInsights[0]?.replyRate || 0}%` }} />
                        </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sequences Needing Love</p>
                        <h3 className="mt-2 text-lg font-bold text-slate-900">None</h3>
                        <p className="text-sm text-slate-500">All systems operational</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fastest Replies</p>
                        <h3 className="mt-2 text-lg font-bold text-slate-900">-</h3>
                        <p className="text-sm text-slate-500">No data yet</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm opacity-60">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Top Performing Step</p>
                        <h3 className="mt-2 text-lg font-bold text-slate-900">No Data</h3>
                        <p className="text-sm text-slate-500">Waiting for live traffic...</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm opacity-60">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sequences Needing Love</p>
                        <h3 className="mt-2 text-lg font-bold text-slate-900">No Data</h3>
                        <p className="text-sm text-slate-500">Waiting for live traffic...</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm opacity-60">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fastest Replies</p>
                        <h3 className="mt-2 text-lg font-bold text-slate-900">No Data</h3>
                        <p className="text-sm text-slate-500">Waiting for live traffic...</p>
                    </div>
                </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Sequence Overview</p>
                        <h3 className="text-2xl font-bold text-slate-900">Health & Reply Rates</h3>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-semibold text-slate-500">Real-time Data</span>
                        <button onClick={loadAnalytics} className="text-slate-400 hover:text-blue-600">
                            <span className={`material-symbols-outlined text-sm ${loading ? 'animate-spin' : ''}`}>refresh</span>
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {snapshots.map((sequence) => (
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
                                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Replies (Clicks)</dt>
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
                    {/* Export button hidden if empty */}
                    {stepInsights.length > 0 && (
                        <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            <span className="material-symbols-outlined text-base">download</span>
                            Export Report
                        </button>
                    )}
                </div>

                {stepInsights.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                        <span className="material-symbols-outlined text-4xl mb-2">bar_chart</span>
                        <p>No step performance data available yet.</p>
                        <p className="text-xs">Once your funnels are active, insights will appear here.</p>
                    </div>
                ) : (
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
                )}
            </div>
        </div>
    );
};

export default SequenceFeedbackPanel;
