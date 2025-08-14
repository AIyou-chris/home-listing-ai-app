import React, { useState, useMemo } from 'react';
import { Lead } from '../types';
import { LeadScoringService, getScoreTierInfo, getScoreColor, getScoreBadgeColor, LEAD_SCORING_RULES } from '../services/leadScoringService';

interface LeadScoringDashboardProps {
    leads: Lead[];
    onLeadSelect?: (lead: Lead) => void;
}

const LeadScoringDashboard: React.FC<LeadScoringDashboardProps> = ({ leads, onLeadSelect }) => {
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'score' | 'name' | 'date'>('score');

    // Calculate all lead scores
    const leadScores = useMemo(() => {
        return LeadScoringService.calculateBulkScores(leads);
    }, [leads]);

    // Get score distribution for analytics
    const scoreDistribution = useMemo(() => {
        return LeadScoringService.getScoreDistribution(leadScores);
    }, [leadScores]);

    // Sort and filter leads
    const sortedLeads = useMemo(() => {
        const leadsWithScores = LeadScoringService.sortLeadsByScore(leads);
        
        let filtered = leadsWithScores;
        if (selectedCategory !== 'all') {
            filtered = leadsWithScores.filter(({ score }) => score.tier === selectedCategory);
        }

        // Sort by selected criteria
        switch (sortBy) {
            case 'score':
                return filtered.sort((a, b) => b.score.totalScore - a.score.totalScore);
            case 'name':
                return filtered.sort((a, b) => a.lead.name.localeCompare(b.lead.name));
            case 'date':
                return filtered.sort((a, b) => new Date(b.lead.date).getTime() - new Date(a.lead.date).getTime());
            default:
                return filtered;
        }
    }, [leads, leadScores, selectedCategory, sortBy]);

    const ScoreDistributionCard = () => (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Lead Score Distribution</h3>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {Object.entries(scoreDistribution.distribution).map(([tier, count]) => {
                    const tierInfo = getScoreTierInfo(tier as any);
                    return (
                        <div key={tier} className="text-center">
                            <div className={`text-2xl font-bold ${getScoreColor(tierInfo.min)}`}>
                                {count}
                            </div>
                            <div className="text-sm text-slate-600">{tier} Leads</div>
                            <div className="text-xs text-slate-500">{tierInfo.description}</div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200">
                <div className="text-center">
                    <div className="text-lg font-bold text-slate-800">
                        {scoreDistribution.averageScore.toFixed(0)}
                    </div>
                    <div className="text-sm text-slate-600">Average Score</div>
                </div>
                <div className="text-center">
                    <div className="text-lg font-bold text-green-600">
                        {scoreDistribution.highestScore}
                    </div>
                    <div className="text-sm text-slate-600">Highest Score</div>
                </div>
                <div className="text-center">
                    <div className="text-lg font-bold text-slate-600">
                        {scoreDistribution.totalLeads}
                    </div>
                    <div className="text-sm text-slate-600">Total Leads</div>
                </div>
            </div>
        </div>
    );

    const LeadScoreCard = ({ lead, score }: { lead: Lead; score: any }) => {
        const tierInfo = getScoreTierInfo(score.tier);
        const recommendations = LeadScoringService.getScoreRecommendations(lead, score);

        return (
            <div 
                className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-sm transition-shadow cursor-pointer"
                onClick={() => onLeadSelect?.(lead)}
            >
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">{(tierInfo as any).emoji || '📊'}</span>
                            <h3 className="font-semibold text-slate-800">{lead.name}</h3>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreBadgeColor(score.tier)}`}>
                            {score.tier}
                        </span>
                    </div>
                    <div className="text-right">
                        <div className={`text-lg font-bold ${getScoreColor(score.totalScore)}`}>
                            {score.totalScore}
                        </div>
                        <div className="text-xs text-slate-500">score</div>
                    </div>
                </div>

                <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <span className="material-symbols-outlined w-4 h-4">email</span>
                        <span className="truncate">{lead.email}</span>
                    </div>
                    {lead.phone && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <span className="material-symbols-outlined w-4 h-4">phone</span>
                            <span>{lead.phone}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <span className="material-symbols-outlined w-4 h-4">schedule</span>
                        <span>{new Date(lead.date).toLocaleDateString()}</span>
                    </div>
                </div>

                {score.breakdown.length > 0 && (
                    <div className="mb-3">
                        <div className="text-xs font-medium text-slate-700 mb-1">Score Breakdown</div>
                        <div className="flex flex-wrap gap-1">
                            {score.breakdown.slice(0, 3).map((item: any) => (
                                <span 
                                    key={item.ruleId}
                                    className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded"
                                    title={item.ruleName}
                                >
                                    +{item.points}
                                </span>
                            ))}
                            {score.breakdown.length > 3 && (
                                <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded">
                                    +{score.breakdown.length - 3} more
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {recommendations.length > 0 && (
                    <div className="border-t border-slate-200 pt-3">
                        <div className="text-xs font-medium text-slate-700 mb-1">💡 Quick Actions</div>
                        <div className="text-xs text-slate-600">
                            {recommendations[0]}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Score Distribution */}
            <ScoreDistributionCard />

            {/* Filters and Controls */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h3 className="text-lg font-bold text-slate-800">Lead Scores</h3>
                    
                    <div className="flex gap-3">
                        {/* Category Filter */}
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="all">All Tiers</option>
                            <option value="Qualified">⭐ Qualified</option>
                            <option value="Hot">🔥🔥 Hot</option>
                            <option value="Warm">🔥 Warm</option>
                            <option value="Cold">❄️ Cold</option>
                        </select>

                        {/* Sort By */}
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="score">Sort by Score</option>
                            <option value="name">Sort by Name</option>
                            <option value="date">Sort by Date</option>
                        </select>
                    </div>
                </div>

                {/* Scoring Rules Info */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-sm font-semibold text-blue-800 mb-2">🎯 How Lead Scoring Works</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-blue-700">
                        <div>📧 <strong>Engagement:</strong> Contact info, message quality</div>
                        <div>🎯 <strong>Behavior:</strong> Status, agent interaction</div>
                        <div>📍 <strong>Source:</strong> Where they came from</div>
                        <div>⏰ <strong>Timing:</strong> When they contacted you</div>
                    </div>
                </div>

                {/* Lead Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {sortedLeads.map(({ lead, score }) => (
                        <LeadScoreCard key={lead.id} lead={lead} score={score} />
                    ))}
                </div>

                {sortedLeads.length === 0 && (
                    <div className="text-center py-12">
                        <span className="material-symbols-outlined w-12 h-12 text-slate-300 mx-auto mb-4 block">group</span>
                        <p className="text-slate-500">No leads found matching your criteria</p>
                    </div>
                )}
            </div>

            {/* Scoring Rules Reference */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Scoring Rules Reference</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries({
                        engagement: LEAD_SCORING_RULES.filter(r => r.category === 'engagement'),
                        behavior: LEAD_SCORING_RULES.filter(r => r.category === 'behavior'),
                        demographics: LEAD_SCORING_RULES.filter(r => r.category === 'demographics'),
                        timing: LEAD_SCORING_RULES.filter(r => r.category === 'timing')
                    }).map(([category, rules]) => (
                        <div key={category}>
                            <h4 className="font-semibold text-slate-700 mb-2 capitalize">{category}</h4>
                            <div className="space-y-2">
                                {rules.map(rule => (
                                    <div key={rule.id} className="flex justify-between items-center text-sm">
                                        <span className="text-slate-600">{rule.name}</span>
                                        <span className="font-medium text-green-600">+{rule.points}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LeadScoringDashboard;
