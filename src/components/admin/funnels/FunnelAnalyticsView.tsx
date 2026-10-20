import React, { useState } from 'react';
import AnalyticsPage from '../../AnalyticsPage';
import SequenceFeedbackPanel from '../../SequenceFeedbackPanel';
import MarketingAnalyticsPanel from '../MarketingAnalyticsPanel';

interface Props { isDemoMode: boolean; userId: string; isBlueprintMode: boolean }

// "View Scoring & Analytics": what is working, the lead scoring engine and sequence feedback. Each card opens and closes.
const FunnelAnalyticsView: React.FC<Props> = ({ isDemoMode, userId, isBlueprintMode }) => {
    const [analyticsExpanded, setAnalyticsExpanded] = useState({ scoring: true, feedback: true });
    return (
        <div className="space-y-8 px-4 md:px-0 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Analytics View */}
            <MarketingAnalyticsPanel />
            <div className="grid grid-cols-1 gap-8">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm transition-all duration-300">
                    <div
                        className="flex items-center justify-between cursor-pointer select-none mb-4"
                        onClick={() => setAnalyticsExpanded(prev => ({ ...prev, scoring: !prev.scoring }))}
                    >
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                <span className="material-symbols-outlined">workspace_premium</span>
                            </span>
                            Lead Scoring Engine
                        </h2>
                        <button className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                            <span className="material-symbols-outlined">
                                {analyticsExpanded.scoring ? 'expand_less' : 'expand_more'}
                            </span>
                        </button>
                    </div>
                    {analyticsExpanded.scoring && (
                        <div className="animate-in slide-in-from-top-4 fade-in duration-300">
                            <AnalyticsPage scope="global" />
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm transition-all duration-300">
                    <div
                        className="flex items-center justify-between cursor-pointer select-none mb-4"
                        onClick={() => setAnalyticsExpanded(prev => ({ ...prev, feedback: !prev.feedback }))}
                    >
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                <span className="material-symbols-outlined">auto_fix_high</span>
                            </span>
                            Sequence Feedback
                        </h2>
                        <button className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                            <span className="material-symbols-outlined">
                                {analyticsExpanded.feedback ? 'expand_less' : 'expand_more'}
                            </span>
                        </button>
                    </div>
                    {analyticsExpanded.feedback && (
                        <div className="animate-in slide-in-from-top-4 fade-in duration-300">
                            <SequenceFeedbackPanel isDemoMode={isDemoMode} userId={userId} isBlueprintMode={isBlueprintMode} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FunnelAnalyticsView;
