import { Lead, LeadStatus } from '../types';

export interface ScoringRule {
    id: string;
    name: string;
    description: string;
    condition: (lead: Lead) => boolean;
    points: number;
    category: 'engagement' | 'demographics' | 'behavior' | 'timing';
    maxOccurrences?: number; // max times this rule can apply per lead
}

export interface LeadScore {
    leadId: string;
    totalScore: number;
    tier: 'Cold' | 'Warm' | 'Hot' | 'Qualified';
    breakdown: ScoreBreakdown[];
    lastUpdated: string;
}

export interface ScoreBreakdown {
    ruleId: string;
    ruleName: string;
    points: number;
    category: string;
    appliedCount: number;
}

// Lead scoring rules - completely client-side!
export const LEAD_SCORING_RULES: ScoringRule[] = [
    // ENGAGEMENT RULES
    {
        id: 'recent_contact',
        name: 'Recent Contact',
        description: 'Lead contacted within last 7 days',
        condition: (lead) => {
            const leadDate = new Date(lead.date);
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            return leadDate > weekAgo;
        },
        points: 25,
        category: 'engagement'
    },
    {
        id: 'phone_provided',
        name: 'Phone Number Provided',
        description: 'Lead provided a phone number',
        condition: (lead) => Boolean(lead.phone && lead.phone.length > 5),
        points: 15,
        category: 'engagement'
    },
    {
        id: 'email_provided',
        name: 'Email Provided',
        description: 'Lead provided an email address',
        condition: (lead) => Boolean(lead.email && lead.email.includes('@')),
        points: 10,
        category: 'engagement'
    },
    {
        id: 'detailed_inquiry',
        name: 'Detailed Inquiry',
        description: 'Lead sent a detailed message (>50 characters)',
        condition: (lead) => lead.lastMessage && lead.lastMessage.length > 50,
        points: 20,
        category: 'engagement'
    },

    // STATUS-BASED RULES
    {
        id: 'qualified_status',
        name: 'Qualified Status',
        description: 'Lead has been qualified by agent',
        condition: (lead) => lead.status === 'Qualified',
        points: 50,
        category: 'behavior'
    },
    {
        id: 'showing_scheduled',
        name: 'Showing Scheduled',
        description: 'Lead has a showing scheduled',
        condition: (lead) => lead.status === 'Showing',
        points: 40,
        category: 'behavior'
    },
    {
        id: 'contacted_status',
        name: 'Agent Contact Made',
        description: 'Agent has contacted the lead',
        condition: (lead) => lead.status === 'Contacted',
        points: 20,
        category: 'behavior'
    },

    // SOURCE-BASED RULES  
    {
        id: 'zillow_source',
        name: 'Zillow Lead',
        description: 'Lead came from Zillow',
        condition: (lead) => lead.source?.toLowerCase().includes('zillow') || false,
        points: 15,
        category: 'demographics'
    },
    {
        id: 'referral_source',
        name: 'Referral Lead', 
        description: 'Lead came from referral',
        condition: (lead) => lead.source?.toLowerCase().includes('referral') || false,
        points: 30,
        category: 'demographics'
    },
    {
        id: 'website_source',
        name: 'Website Direct',
        description: 'Lead came directly from website',
        condition: (lead) => lead.source?.toLowerCase().includes('website') || false,
        points: 20,
        category: 'demographics'
    },

    // TIMING-BASED RULES
    {
        id: 'weekend_inquiry',
        name: 'Weekend Inquiry',
        description: 'Lead contacted during weekend (shows urgency)',
        condition: (lead) => {
            const leadDate = new Date(lead.date);
            const dayOfWeek = leadDate.getDay();
            return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
        },
        points: 10,
        category: 'timing'
    },
    {
        id: 'evening_inquiry',
        name: 'Evening Inquiry',
        description: 'Lead contacted in evening (shows dedication)',
        condition: (lead) => {
            const leadDate = new Date(lead.date);
            const hour = leadDate.getHours();
            return hour >= 18 || hour <= 6; // 6 PM to 6 AM
        },
        points: 5,
        category: 'timing'
    },

    // COMMUNICATION QUALITY
    {
        id: 'professional_message',
        name: 'Professional Communication',
        description: 'Lead uses professional language',
        condition: (lead) => {
            const message = lead.lastMessage?.toLowerCase() || '';
            const professionalKeywords = ['interested', 'schedule', 'appointment', 'showing', 'available', 'please', 'thank you'];
            return professionalKeywords.some(keyword => message.includes(keyword));
        },
        points: 15,
        category: 'engagement'
    },
    {
        id: 'specific_questions',
        name: 'Specific Questions',
        description: 'Lead asks specific property questions',
        condition: (lead) => {
            const message = lead.lastMessage?.toLowerCase() || '';
            const questionKeywords = ['price', 'square feet', 'bedrooms', 'bathrooms', 'neighborhood', 'schools', 'hoa'];
            return questionKeywords.some(keyword => message.includes(keyword));
        },
        points: 25,
        category: 'engagement'
    }
];

// Score tier thresholds
export const SCORE_TIERS = {
    COLD: { min: 0, max: 30, color: 'slate', description: 'Needs nurturing' },
    WARM: { min: 31, max: 70, color: 'yellow', description: 'Shows interest' },
    HOT: { min: 71, max: 110, color: 'orange', description: 'High potential' },
    QUALIFIED: { min: 111, max: 999, color: 'green', description: 'Ready to buy' }
};

export class LeadScoringService {
    // Calculate lead score based on rules
    static calculateLeadScore(lead: Lead): LeadScore {
        const breakdown: ScoreBreakdown[] = [];
        let totalScore = 0;

        // Apply each scoring rule
        for (const rule of LEAD_SCORING_RULES) {
            if (rule.condition(lead)) {
                const appliedCount = 1; // For now, each rule applies once
                const points = rule.points * appliedCount;
                
                totalScore += points;
                breakdown.push({
                    ruleId: rule.id,
                    ruleName: rule.name,
                    points: points,
                    category: rule.category,
                    appliedCount: appliedCount
                });
            }
        }

        // Determine tier based on total score
        let tier: LeadScore['tier'] = 'Cold';
        if (totalScore >= SCORE_TIERS.QUALIFIED.min) tier = 'Qualified';
        else if (totalScore >= SCORE_TIERS.HOT.min) tier = 'Hot';
        else if (totalScore >= SCORE_TIERS.WARM.min) tier = 'Warm';

        return {
            leadId: lead.id,
            totalScore,
            tier,
            breakdown,
            lastUpdated: new Date().toISOString()
        };
    }

    // Calculate scores for multiple leads
    static calculateBulkScores(leads: Lead[]): LeadScore[] {
        return leads.map(lead => this.calculateLeadScore(lead));
    }

    // Get scoring insights for analytics
    static getScoreDistribution(leadScores: LeadScore[]) {
        const distribution = {
            Cold: 0,
            Warm: 0,
            Hot: 0,
            Qualified: 0
        };

        leadScores.forEach(score => {
            distribution[score.tier]++;
        });

        return {
            distribution,
            totalLeads: leadScores.length,
            averageScore: leadScores.reduce((sum, score) => sum + score.totalScore, 0) / leadScores.length || 0,
            highestScore: Math.max(...leadScores.map(s => s.totalScore), 0),
            lowestScore: Math.min(...leadScores.map(s => s.totalScore), 0)
        };
    }

    // Get recommendations for improving lead scores
    static getScoreRecommendations(lead: Lead, score: LeadScore): string[] {
        const recommendations: string[] = [];

        // Check which rules didn't apply and suggest actions
        const appliedRuleIds = score.breakdown.map(b => b.ruleId);
        
        LEAD_SCORING_RULES.forEach(rule => {
            if (!appliedRuleIds.includes(rule.id)) {
                switch (rule.id) {
                    case 'phone_provided':
                        if (!lead.phone) recommendations.push('📞 Get their phone number for faster contact');
                        break;
                    case 'detailed_inquiry':
                        if (lead.lastMessage && lead.lastMessage.length <= 50) {
                            recommendations.push('💬 Ask open-ended questions to get more details');
                        }
                        break;
                    case 'qualified_status':
                        if (lead.status !== 'Qualified') {
                            recommendations.push('✅ Qualify this lead through a discovery call');
                        }
                        break;
                    case 'showing_scheduled':
                        if (lead.status !== 'Showing') {
                            recommendations.push('🏠 Schedule a property showing');
                        }
                        break;
                    case 'professional_message':
                        recommendations.push('🎯 Use professional language in communications');
                        break;
                }
            }
        });

        return recommendations.slice(0, 3); // Return top 3 recommendations
    }

    // Sort leads by score (highest first)
    static sortLeadsByScore(leads: Lead[]): { lead: Lead; score: LeadScore }[] {
        const leadScores = this.calculateBulkScores(leads);
        
        return leads.map(lead => ({
            lead,
            score: leadScores.find(s => s.leadId === lead.id)!
        })).sort((a, b) => b.score.totalScore - a.score.totalScore);
    }
}

// Utility functions for UI
export const getScoreTierInfo = (tier: LeadScore['tier']) => {
    switch (tier) {
        case 'Cold':
            return { ...SCORE_TIERS.COLD, icon: 'ac_unit', emoji: '❄️' };
        case 'Warm':
            return { ...SCORE_TIERS.WARM, icon: 'local_fire_department', emoji: '🔥' };
        case 'Hot':
            return { ...SCORE_TIERS.HOT, icon: 'whatshot', emoji: '🔥🔥' };
        case 'Qualified':
            return { ...SCORE_TIERS.QUALIFIED, icon: 'verified', emoji: '⭐' };
        default:
            return SCORE_TIERS.COLD;
    }
};

export const getScoreColor = (score: number): string => {
    if (score >= SCORE_TIERS.QUALIFIED.min) return 'text-green-600';
    if (score >= SCORE_TIERS.HOT.min) return 'text-orange-600';
    if (score >= SCORE_TIERS.WARM.min) return 'text-yellow-600';
    return 'text-slate-600';
};

export const getScoreBadgeColor = (tier: LeadScore['tier']): string => {
    switch (tier) {
        case 'Cold': return 'bg-slate-100 text-slate-700';
        case 'Warm': return 'bg-yellow-100 text-yellow-700';
        case 'Hot': return 'bg-orange-100 text-orange-700';
        case 'Qualified': return 'bg-green-100 text-green-700';
        default: return 'bg-slate-100 text-slate-700';
    }
};
