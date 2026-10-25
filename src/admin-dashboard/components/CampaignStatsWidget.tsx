
import React from 'react';
import { Mail, Activity, AlertTriangle, MousePointerClick, Eye, UserMinus } from 'lucide-react';
import Collapsible from '../../marketing-engine/screens/Collapsible';

interface CampaignStats {
    emailsSent: number;
    deliveryRate: number | null;
    activeLeads: number;
    bounced: number;
    opens: number;
    clicks: number;
    unsubscribed: number;
}

interface CampaignStatsWidgetProps {
    stats: CampaignStats | null;
    loading?: boolean;
}

export const CampaignStatsWidget: React.FC<CampaignStatsWidgetProps> = ({ stats, loading }) => {
    if (loading) {
        return <div className="animate-pulse h-64 bg-gray-100 rounded-lg mb-6"></div>;
    }

    if (!stats) {
        return (
            <Collapsible title="Campaign Command" hint="Email results, last 30 days">
                <p className="text-sm text-slate-700">Not available right now.</p>
            </Collapsible>
        );
    }

    return (
        <Collapsible
            title="Campaign Command"
            hint="Email results, last 30 days"
            badge={
                <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-700 rounded-full">Live Feed</span>
            }
        >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                {/* Emails Sent */}
                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                    <div className="flex items-center gap-2 mb-1">
                        <Mail className="w-4 h-4 text-indigo-500" />
                        <span className="text-xs font-medium text-indigo-600 uppercase tracking-wider">Emails Sent</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{stats.emailsSent.toLocaleString()}</div>
                </div>

                {/* Delivery Rate */}
                <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                    <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Delivery Rate</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{stats.deliveryRate === null ? 'Not available' : `${stats.deliveryRate}%`}</div>
                </div>

                {/* Opens */}
                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-2 mb-1">
                        <Eye className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-medium text-blue-600 uppercase tracking-wider">Opened</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{stats.opens.toLocaleString()}</div>
                </div>

                {/* Clicks */}
                <div className="p-4 bg-violet-50/50 rounded-xl border border-violet-100">
                    <div className="flex items-center gap-2 mb-1">
                        <MousePointerClick className="w-4 h-4 text-violet-500" />
                        <span className="text-xs font-medium text-violet-600 uppercase tracking-wider">Clicked</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{stats.clicks.toLocaleString()}</div>
                </div>

                {/* Unsubscribed */}
                <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                        <UserMinus className="w-4 h-4 text-gray-500" />
                        <span className="text-xs font-medium text-gray-600 uppercase tracking-wider">Unsubs</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{stats.unsubscribed.toLocaleString()}</div>
                </div>

                {/* Active Funnels */}
                <div className="p-4 bg-sky-50/50 rounded-xl border border-sky-100">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                        </div>
                        <span className="text-xs font-medium text-sky-600 uppercase tracking-wider">Active Pipe</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{stats.activeLeads}</div>
                </div>


                {/* Bounced */}
                <div className="p-4 bg-red-50/50 rounded-xl border border-red-100">
                    <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span className="text-xs font-medium text-red-600 uppercase tracking-wider">Bounced</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{stats.bounced}</div>
                </div>

            </div>
        </Collapsible>
    );
};
