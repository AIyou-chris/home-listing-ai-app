import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

interface StepMetrics {
    stepId: string;
    stepTitle: string;
    email: {
        sent: number;
        opens: number;
        clicks: number;
        bounces: number;
        openRate: string;
        clickRate: string;
        bounceRate: string;
    };
    sms: {
        sent: number;
        delivered: number;
        failed: number;
        deliveryRate: string;
        failureRate: string;
    };
}

interface AdminFunnelAnalyticsProps {
    funnelId: string;
    steps: Array<{ id: string; title: string }>;
}

const getPerformanceColor = (rate: number, metric: 'open' | 'click' | 'delivery' | 'bounce'): string => {
    if (metric === 'bounce') {
        if (rate > 5) return 'text-red-600';
        if (rate > 2) return 'text-yellow-600';
        return 'text-green-600';
    }

    if (metric === 'delivery') {
        if (rate >= 95) return 'text-green-600';
        if (rate >= 85) return 'text-yellow-600';
        return 'text-red-600';
    }

    // open/click rates
    if (rate >= 40) return 'text-green-600';
    if (rate >= 20) return 'text-yellow-600';
    return 'text-red-600';
};

const getPerformanceIcon = (rate: number, metric: 'open' | 'click' | 'delivery' | 'bounce'): string => {
    if (metric === 'bounce') {
        if (rate > 5) return '🔴';
        if (rate > 2) return '⚠️';
        return '🟢';
    }

    if (metric === 'delivery') {
        if (rate >= 95) return '🟢';
        if (rate >= 85) return '🟡';
        return '🔴';
    }

    if (rate >= 40) return '🟢';
    if (rate >= 20) return '🟡';
    return '🔴';
};

const AdminFunnelAnalytics: React.FC<AdminFunnelAnalyticsProps> = ({ funnelId, steps }) => {
    const [metrics, setMetrics] = useState<StepMetrics[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMetrics = async () => {
            setLoading(true);
            try {
                // Fetch tracking events for this funnel
                const { data: emailEvents } = await supabase
                    .from('email_tracking_events')
                    .select('*')
                    .eq('funnel_type', funnelId);

                const { data: smsEvents } = await supabase
                    .from('sms_tracking_events')
                    .select('*')
                    .eq('funnel_type', funnelId);

                // Aggregate by step
                const stepMetricsMap: Record<string, StepMetrics> = {};

                steps.forEach(step => {
                    const stepEmailEvents = emailEvents?.filter(e => e.step_id === step.id) || [];
                    const stepSmsEvents = smsEvents?.filter(s => s.step_id === step.id) || [];

                    const emailSent = stepEmailEvents.length;
                    const emailOpens = stepEmailEvents.filter(e => e.opened_at).length;
                    const emailClicks = stepEmailEvents.reduce((sum, e) => sum + (e.click_count || 0), 0);
                    const emailBounces = stepEmailEvents.filter(e => e.bounced_at).length;

                    const smsSent = stepSmsEvents.length;
                    const smsDelivered = stepSmsEvents.filter(s => s.delivered_at).length;
                    const smsFailed = stepSmsEvents.filter(s => s.failed_at).length;

                    stepMetricsMap[step.id] = {
                        stepId: step.id,
                        stepTitle: step.title,
                        email: {
                            sent: emailSent,
                            opens: emailOpens,
                            clicks: emailClicks,
                            bounces: emailBounces,
                            openRate: emailSent > 0 ? ((emailOpens / emailSent) * 100).toFixed(1) : '0.0',
                            clickRate: emailSent > 0 ? ((emailClicks / emailSent) * 100).toFixed(1) : '0.0',
                            bounceRate: emailSent > 0 ? ((emailBounces / emailSent) * 100).toFixed(1) : '0.0'
                        },
                        sms: {
                            sent: smsSent,
                            delivered: smsDelivered,
                            failed: smsFailed,
                            deliveryRate: smsSent > 0 ? ((smsDelivered / smsSent) * 100).toFixed(1) : '0.0',
                            failureRate: smsSent > 0 ? ((smsFailed / smsSent) * 100).toFixed(1) : '0.0'
                        }
                    };
                });

                setMetrics(Object.values(stepMetricsMap));
            } catch (error) {
                console.error('Error fetching funnel metrics:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
    }, [funnelId, steps]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3 text-slate-500">
                    <span className="material-symbols-outlined animate-spin">refresh</span>
                    <span>Loading analytics...</span>
                </div>
            </div>
        );
    }

    const totalEmails = metrics.reduce((sum, m) => sum + m.email.sent, 0);
    const totalSms = metrics.reduce((sum, m) => sum + m.sms.sent, 0);

    if (totalEmails === 0 && totalSms === 0) {
        return (
            <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
                <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">query_stats</span>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Analytics Data Yet</h3>
                <p className="text-sm text-slate-500 mb-6">
                    Start sending emails and SMS through this funnel to see performance metrics here.
                </p>
                <div className="inline-flex flex-col gap-2 text-xs text-slate-400">
                    <span>💡 Tip: Upload CSV leads or manually send test emails to generate data</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-500 rounded-lg p-2">
                            <span className="material-symbols-outlined text-white text-xl">mail</span>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Total Emails</p>
                            <p className="text-2xl font-bold text-blue-900">{totalEmails.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-green-500 rounded-lg p-2">
                            <span className="material-symbols-outlined text-white text-xl">sms</span>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Total SMS</p>
                            <p className="text-2xl font-bold text-green-900">{totalSms.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-purple-500 rounded-lg p-2">
                            <span className="material-symbols-outlined text-white text-xl">campaign</span>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Total Sends</p>
                            <p className="text-2xl font-bold text-purple-900">{(totalEmails + totalSms).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Per-Step Metrics */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Performance by Step</h3>

                {metrics.map((metric, index) => (
                    <div key={metric.stepId} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-indigo-100 rounded-lg px-3 py-1 text-indigo-700 font-bold text-xs">
                                STEP {index + 1}
                            </div>
                            <h4 className="text-base font-semibold text-slate-900">{metric.stepTitle}</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Email Metrics */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="material-symbols-outlined text-blue-500">mail</span>
                                    <h5 className="text-sm font-bold text-slate-700">Email Performance</h5>
                                </div>

                                {metric.email.sent > 0 ? (
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-600">Sent:</span>
                                            <span className="font-semibold text-slate-900">{metric.email.sent}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-600">Opens:</span>
                                            <span className={`font-semibold ${getPerformanceColor(parseFloat(metric.email.openRate), 'open')}`}>
                                                {metric.email.opens} ({metric.email.openRate}%) {getPerformanceIcon(parseFloat(metric.email.openRate), 'open')}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-600">Clicks:</span>
                                            <span className={`font-semibold ${getPerformanceColor(parseFloat(metric.email.clickRate), 'click')}`}>
                                                {metric.email.clicks} ({metric.email.clickRate}%) {getPerformanceIcon(parseFloat(metric.email.clickRate), 'click')}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-600">Bounces:</span>
                                            <span className={`font-semibold ${getPerformanceColor(parseFloat(metric.email.bounceRate), 'bounce')}`}>
                                                {metric.email.bounces} ({metric.email.bounceRate}%) {getPerformanceIcon(parseFloat(metric.email.bounceRate), 'bounce')}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-400 italic">No emails sent for this step yet</p>
                                )}
                            </div>

                            {/* SMS Metrics */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="material-symbols-outlined text-green-500">sms</span>
                                    <h5 className="text-sm font-bold text-slate-700">SMS Performance</h5>
                                </div>

                                {metric.sms.sent > 0 ? (
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-600">Sent:</span>
                                            <span className="font-semibold text-slate-900">{metric.sms.sent}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-600">Delivered:</span>
                                            <span className={`font-semibold ${getPerformanceColor(parseFloat(metric.sms.deliveryRate), 'delivery')}`}>
                                                {metric.sms.delivered} ({metric.sms.deliveryRate}%) {getPerformanceIcon(parseFloat(metric.sms.deliveryRate), 'delivery')}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-600">Failed:</span>
                                            <span className="font-semibold text-red-600">
                                                {metric.sms.failed} ({metric.sms.failureRate}%)
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-400 italic">No SMS sent for this step yet</p>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminFunnelAnalytics;
