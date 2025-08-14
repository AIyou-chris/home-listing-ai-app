import React from 'react';
import Modal from './Modal';
import { FollowUpSequence, SequenceAnalytics } from '../types';

interface SequenceAnalyticsModalProps {
    sequence: FollowUpSequence;
    onClose: () => void;
}

const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: string;
    color: string;
    subValue?: string;
}> = ({ title, value, icon, color, subValue }) => (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-2">
            <span className={`material-symbols-outlined w-6 h-6 ${color}`}>{icon}</span>
            <span className="text-2xl font-bold text-slate-800">{value}</span>
        </div>
        <h4 className="text-sm font-medium text-slate-600">{title}</h4>
        {subValue && <p className="text-xs text-slate-500 mt-1">{subValue}</p>}
    </div>
);

const SequenceAnalyticsModal: React.FC<SequenceAnalyticsModalProps> = ({ sequence, onClose }) => {
    // Mock analytics data - in real app, this would come from your analytics service
    const analytics: SequenceAnalytics = sequence.analytics || {
        totalLeads: 342,
        emailsSent: 1256,
        emailsOpened: 876,
        emailsClicked: 234,
        tasksCompleted: 89,
        meetingsScheduled: 67,
        appointmentsBooked: 45,
        responsesReceived: 127,
        openRate: 69.7,
        clickRate: 18.6,
        responseRate: 37.1,
        appointmentRate: 13.2,
        avgResponseTime: 8.5,
        lastUpdated: new Date().toISOString()
    };

    const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

    const titleNode = (
        <div className="flex items-center gap-3">
            <span className="material-symbols-outlined w-5 h-5 text-primary-600 flex-shrink-0">monitoring</span>
            <span className="text-xl font-bold text-slate-800">Sequence Analytics</span>
        </div>
    );

    return (
        <Modal title={titleNode} onClose={onClose}>
            <div className="p-6 max-h-[80vh] overflow-y-auto">
                {/* Sequence Info */}
                <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                    <h3 className="font-bold text-slate-800 text-lg">{sequence.name}</h3>
                    <p className="text-slate-600 text-sm mt-1">{sequence.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <span><strong>Trigger:</strong> {sequence.triggerType}</span>
                        <span><strong>Steps:</strong> {sequence.steps.length}</span>
                        <span><strong>Status:</strong> <span className={sequence.isActive ? 'text-green-600' : 'text-slate-400'}>{sequence.isActive ? 'Active' : 'Inactive'}</span></span>
                    </div>
                </div>

                {/* Key Metrics */}
                <div className="mb-6">
                    {/* Top 3 Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <StatCard
                            title="Total Leads"
                            value={analytics.totalLeads}
                            icon="group"
                            color="text-blue-600"
                            subValue="All time"
                        />
                        <StatCard
                            title="Appointments Booked"
                            value={analytics.appointmentsBooked}
                            icon="calendar_month"
                            color="text-green-600"
                            subValue={formatPercentage(analytics.appointmentRate)}
                        />
                        <StatCard
                            title="Responses Received"
                            value={analytics.responsesReceived}
                            icon="chat_bubble"
                            color="text-purple-600"
                            subValue={formatPercentage(analytics.responseRate)}
                        />
                    </div>
                    
                    {/* Response Time Bar */}
                    <div className="bg-white rounded-lg border border-slate-200 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined w-6 h-6 text-orange-600">schedule</span>
                                <div>
                                    <h4 className="text-sm font-medium text-slate-600">Average Response Time</h4>
                                    <p className="text-xs text-slate-500">How quickly leads engage with your sequence</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-2xl font-bold text-slate-800">{analytics.avgResponseTime}</span>
                                <span className="text-lg text-slate-600 ml-1">hrs</span>
                            </div>
                        </div>
                        
                        {/* Visual Response Time Bar */}
                        <div className="relative">
                            <div className="w-full bg-slate-200 rounded-full h-3">
                                <div 
                                    className={`h-3 rounded-full transition-all duration-1000 ${
                                        analytics.avgResponseTime < 12 ? 'bg-green-500' : 
                                        analytics.avgResponseTime < 24 ? 'bg-yellow-500' : 
                                        'bg-orange-500'
                                    }`}
                                    style={{ 
                                        width: `${Math.min((24 - analytics.avgResponseTime) / 24 * 100, 100)}%` 
                                    }}
                                ></div>
                            </div>
                            <div className="flex justify-between text-xs text-slate-500 mt-1">
                                <span>Instant</span>
                                <span>12 hrs</span>
                                <span>24+ hrs</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Email Performance */}
                <div className="mb-6">
                    <h4 className="text-lg font-bold text-slate-800 mb-4">Email Performance</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="material-symbols-outlined w-5 h-5 text-blue-600">mail</span>
                                <span className="text-xl font-bold text-blue-800">{analytics.emailsSent}</span>
                            </div>
                            <h5 className="text-sm font-medium text-blue-700">Emails Sent</h5>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="material-symbols-outlined w-5 h-5 text-green-600">mark_email_read</span>
                                <span className="text-xl font-bold text-green-800">{analytics.emailsOpened}</span>
                            </div>
                            <h5 className="text-sm font-medium text-green-700">Emails Opened</h5>
                            <p className="text-xs text-green-600">{formatPercentage(analytics.openRate)} open rate</p>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="material-symbols-outlined w-5 h-5 text-purple-600">ads_click</span>
                                <span className="text-xl font-bold text-purple-800">{analytics.emailsClicked}</span>
                            </div>
                            <h5 className="text-sm font-medium text-purple-700">Links Clicked</h5>
                            <p className="text-xs text-purple-600">{formatPercentage(analytics.clickRate)} click rate</p>
                        </div>
                    </div>
                </div>

                {/* Activity Performance */}
                <div className="mb-6">
                    <h4 className="text-lg font-bold text-slate-800 mb-4">Activity Performance</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="material-symbols-outlined w-5 h-5 text-yellow-600">task_alt</span>
                                <span className="text-xl font-bold text-yellow-800">{analytics.tasksCompleted}</span>
                            </div>
                            <h5 className="text-sm font-medium text-yellow-700">Tasks Completed</h5>
                            <p className="text-xs text-yellow-600">By your team</p>
                        </div>
                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="material-symbols-outlined w-5 h-5 text-indigo-600">calendar_month</span>
                                <span className="text-xl font-bold text-indigo-800">{analytics.meetingsScheduled}</span>
                            </div>
                            <h5 className="text-sm font-medium text-indigo-700">Meetings Scheduled</h5>
                            <p className="text-xs text-indigo-600">From this sequence</p>
                        </div>
                    </div>
                </div>

                {/* Performance Insights */}
                <div className="bg-slate-50 rounded-lg p-4">
                    <h4 className="text-lg font-bold text-slate-800 mb-3">💡 Performance Insights</h4>
                    <div className="space-y-2 text-sm">
                        {analytics.openRate > 25 ? (
                            <div className="flex items-center gap-2 text-green-700">
                                <span className="material-symbols-outlined w-4 h-4">check_circle</span>
                                <span>Excellent open rate! Your subject lines are working well.</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-orange-600">
                                <span className="material-symbols-outlined w-4 h-4">warning</span>
                                <span>Low open rate. Try improving your subject lines.</span>
                            </div>
                        )}
                        
                        {analytics.responseRate > 30 ? (
                            <div className="flex items-center gap-2 text-green-700">
                                <span className="material-symbols-outlined w-4 h-4">check_circle</span>
                                <span>Great response rate! Leads are engaging with your content.</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-orange-600">
                                <span className="material-symbols-outlined w-4 h-4">warning</span>
                                <span>Consider adding more compelling calls-to-action.</span>
                            </div>
                        )}
                        
                        {analytics.appointmentRate > 10 ? (
                            <div className="flex items-center gap-2 text-green-700">
                                <span className="material-symbols-outlined w-4 h-4">check_circle</span>
                                <span>Outstanding appointment rate! This sequence drives real meetings.</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-blue-600">
                                <span className="material-symbols-outlined w-4 h-4">lightbulb</span>
                                <span>Try adding clearer scheduling prompts to boost appointments.</span>
                            </div>
                        )}

                        {analytics.avgResponseTime < 12 ? (
                            <div className="flex items-center gap-2 text-green-700">
                                <span className="material-symbols-outlined w-4 h-4">check_circle</span>
                                <span>Fast response time! Leads are highly engaged.</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-blue-600">
                                <span className="material-symbols-outlined w-4 h-4">lightbulb</span>
                                <span>Consider adding urgency or time-sensitive offers.</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Last Updated */}
                <div className="mt-4 text-xs text-slate-500 text-center">
                    Last updated: {new Date(analytics.lastUpdated).toLocaleDateString()} at {new Date(analytics.lastUpdated).toLocaleTimeString()}
                </div>
            </div>
        </Modal>
    );
};

export default SequenceAnalyticsModal;
