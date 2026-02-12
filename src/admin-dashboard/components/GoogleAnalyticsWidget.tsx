
import React from 'react';
import { BarChart, Users, Eye, Activity, MousePointer2 } from 'lucide-react';

interface GAStats {
    activeUsers: number;
    newUsers: number;
    sessions: number;
    screenPageViews: number;
    engagementRate: number;
}

interface GoogleAnalyticsWidgetProps {
    stats: GAStats | null;
    loading?: boolean;
    error?: string | null;
}

export const GoogleAnalyticsWidget: React.FC<GoogleAnalyticsWidgetProps> = ({ stats, loading, error }) => {
    if (loading) {
        return <div className="animate-pulse h-32 bg-gray-100 rounded-lg mb-6"></div>;
    }

    if (error) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-6 relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <BarChart className="w-5 h-5 text-orange-600" />
                        Google Analytics
                    </h2>
                    <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                        Not Connected
                    </span>
                </div>
                <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg border border-dashed border-gray-200 text-center">
                    {error}
                </div>
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-6 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-50 rounded-full opacity-20 -mr-16 -mt-16 pointer-events-none"></div>

            <div className="flex items-center justify-between mb-4 relative z-10">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <BarChart className="w-5 h-5 text-orange-600" />
                    Google Analytics
                </h2>
                <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    Last 30 Days
                </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 relative z-10">

                {/* Users */}
                <div className="p-4 bg-orange-50/50 rounded-xl border border-orange-100">
                    <div className="flex items-center gap-2 mb-1">
                        <Users className="w-4 h-4 text-orange-500" />
                        <span className="text-xs font-medium text-orange-600 uppercase tracking-wider">Active Users</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{stats.activeUsers.toLocaleString()}</div>
                </div>

                {/* New Users */}
                <div className="p-4 bg-yellow-50/50 rounded-xl border border-yellow-100">
                    <div className="flex items-center gap-2 mb-1">
                        <Users className="w-4 h-4 text-yellow-600" />
                        <span className="text-xs font-medium text-yellow-700 uppercase tracking-wider">New Users</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{stats.newUsers.toLocaleString()}</div>
                </div>

                {/* Sessions */}
                <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                    <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-4 h-4 text-purple-500" />
                        <span className="text-xs font-medium text-purple-600 uppercase tracking-wider">Sessions</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{stats.sessions.toLocaleString()}</div>
                </div>

                {/* Views */}
                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-2 mb-1">
                        <Eye className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-medium text-blue-600 uppercase tracking-wider">Views</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{stats.screenPageViews.toLocaleString()}</div>
                </div>

                {/* Engagement */}
                <div className="p-4 bg-green-50/50 rounded-xl border border-green-100">
                    <div className="flex items-center gap-2 mb-1">
                        <MousePointer2 className="w-4 h-4 text-green-500" />
                        <span className="text-xs font-medium text-green-600 uppercase tracking-wider">Engagement</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{(stats.engagementRate * 100).toFixed(1)}%</div>
                </div>

            </div>
        </div>
    );
};
