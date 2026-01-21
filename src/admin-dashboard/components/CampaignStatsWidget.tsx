
import React from 'react';
import { Mail, Activity, AlertTriangle, Send } from 'lucide-react';

interface CampaignStats {
    emailsSent: number;
    deliveryRate: number;
    activeLeads: number;
    bounced: number;
}

interface CampaignStatsWidgetProps {
    stats: CampaignStats | null;
    loading?: boolean;
}

export const CampaignStatsWidget: React.FC<CampaignStatsWidgetProps> = ({ stats, loading }) => {
    if (loading) {
        return <div className="animate-pulse h-32 bg-gray-100 rounded-lg mb-6"></div>;
    }

    if (!stats) return null;

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-6 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full opacity-20 -mr-16 -mt-16 pointer-events-none"></div>

            <div className="flex items-center justify-between mb-4 relative z-10">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Send className="w-5 h-5 text-indigo-600" />
                    Campaign Command
                </h2>
                <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Live Feed
                </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">

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
                    <div className="text-2xl font-bold text-gray-900">{stats.deliveryRate}%</div>
                </div>

                {/* Active Funnels */}
                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                        </div>
                        <span className="text-xs font-medium text-blue-600 uppercase tracking-wider">Active Pipe</span>
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
        </div>
    );
};
