import React from 'react';
import { AgentProfile } from '../../types';

interface UsageStatsCardProps {
    profile: AgentProfile;
}

export const UsageStatsCard: React.FC<UsageStatsCardProps> = ({ profile }) => {
    const voiceUsed = profile.voice_minutes_used || 0;
    const voiceLimit = profile.voice_allowance_monthly || 60;
    const voicePercent = Math.min((voiceUsed / voiceLimit) * 100, 100);

    const smsUsed = profile.sms_sent_monthly || 0;
    // Soft limit for SMS visualization, usually unlimited or high tier
    const smsProjection = 1000;
    const smsPercent = Math.min((smsUsed / smsProjection) * 100, 100);

    const getStatusColor = (percent: number) => {
        if (percent >= 90) return 'bg-red-500';
        if (percent >= 70) return 'bg-amber-500';
        return 'bg-emerald-500';
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 md:col-span-1 lg:col-span-1">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400 text-lg">stacked_bar_chart</span>
                Monthly Usage
            </h3>

            <div className="space-y-6">
                {/* Voice Usage */}
                <div>
                    <div className="flex justify-between items-end mb-1">
                        <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">mic</span>
                            Voice AI
                        </span>
                        <span className="text-xs font-medium text-slate-500">
                            <span className={voiceUsed >= voiceLimit ? 'text-red-500 font-bold' : 'text-slate-900'}>
                                {voiceUsed}
                            </span>
                            <span className="text-slate-400"> / {voiceLimit} min</span>
                        </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${getStatusColor(voicePercent)}`}
                            style={{ width: `${voicePercent}%` }}
                        />
                    </div>
                    {voiceUsed >= voiceLimit && (
                        <p className="text-[10px] text-red-500 mt-1 font-medium">Over limit. Calls paused.</p>
                    )}
                </div>

                {/* SMS Usage */}
                <div>
                    <div className="flex justify-between items-end mb-1">
                        <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">sms</span>
                            SMS Segments
                        </span>
                        <span className="text-xs font-medium text-slate-900">
                            {smsUsed.toLocaleString()} <span className="text-slate-400 font-normal">sent</span>
                        </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-violet-500 rounded-full transition-all duration-500"
                            style={{ width: `${smsPercent}%` }}
                        />
                    </div>
                </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 text-center">
                <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline">
                    View Detailed Analytics
                </button>
            </div>
        </div>
    );
};
