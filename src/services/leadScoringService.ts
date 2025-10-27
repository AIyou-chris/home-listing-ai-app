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
    private static backendOfflineUntil: number | null = null;
    private static leadErrorCache = new Map<string, { reason: string; status?: number; code?: string; recordedAt: number }>();
    private static loggedMessages = new Set<string>();
    private static readonly CACHE_TTL_MS = 5 * 60 * 1000;
    private static readonly BACKEND_RETRY_DELAY_MS = 30 * 1000;

    private static logOnce(message: string, key: string, level: 'warn' | 'info' = 'warn') {
        if (this.loggedMessages.has(key)) {
            return;
        }
        this.loggedMessages.add(key);
        const logger = level === 'info' ? console.info : console.warn;
        logger(message);
    }

    private static shouldSkipLeadBackendCall(leadId: string): boolean {
        if (!leadId) {
            return false;
        }
        const cached = this.leadErrorCache.get(leadId);
        if (!cached) {
            return false;
        }
        if (Date.now() - cached.recordedAt > this.CACHE_TTL_MS) {
            this.leadErrorCache.delete(leadId);
            this.loggedMessages.delete(`lead-fail-${leadId}`);
            return false;
        }
        return true;
    }

    private static cacheLeadFailure(leadId: string, reason: string, status?: number, code?: string) {
        if (!leadId) {
            return;
        }
        this.leadErrorCache.set(leadId, {
            reason,
            status,
            code,
            recordedAt: Date.now()
        });
    }

    private static flushLeadFailure(leadId: string) {
        if (!leadId) {
            return;
        }
        if (this.leadErrorCache.delete(leadId)) {
            this.loggedMessages.delete(`lead-fail-${leadId}`);
            this.loggedMessages.delete(`lead-missing-${leadId}`);
        }
    }

    private static extractErrorInfo(response: Response | null, payload: any, fallbackMessage: string) {
        const details = Array.isArray(payload?.details) ? payload.details.join('; ') : undefined;
        const reasons = Array.isArray(payload?.reasons) ? payload.reasons.join('; ') : undefined;
        return {
            message: details || reasons || payload?.error || payload?.message || response?.statusText || fallbackMessage,
            status: response?.status,
            code: payload?.code
        };
    }

    private static recordBulkFailures(payload: any) {
        if (!payload) {
            return;
        }

        if (Array.isArray(payload.failedLeads)) {
            payload.failedLeads.forEach((failed: any) => {
                const leadId = typeof failed?.leadId === 'string' ? failed.leadId : undefined;
                if (!leadId) {
                    return;
                }
                const reasons = Array.isArray(failed?.reasons) ? failed.reasons.join('; ') : failed?.reason;
                const message = reasons || 'Lead could not be scored';
                this.cacheLeadFailure(leadId, message, 422, 'lead_validation_failed');
                this.logOnce(
                    `Lead ${failed?.leadName || leadId} could not be scored: ${message}`,
                    `lead-fail-${leadId}`
                );
            });
        }

        if (Array.isArray(payload.missingLeadIds)) {
            payload.missingLeadIds.forEach((leadId: any) => {
                if (typeof leadId !== 'string') {
                    return;
                }
                this.cacheLeadFailure(leadId, 'Lead could not be found on the backend', 404, 'lead_not_found');
                this.logOnce(
                    `Lead ${leadId} could not be found on the backend during scoring`,
                    `lead-missing-${leadId}`
                );
            });
        }
    }

    private static resetBackendOutageFlags() {
        this.backendOfflineUntil = null;
        this.loggedMessages.delete('backend-scoring-unavailable');
        this.loggedMessages.delete('backend-offline');
        this.loggedMessages.delete('bulk-backend-offline');
    }

    // Calculate lead score - prefers backend, falls back gracefully
    static async calculateLeadScore(lead: Lead): Promise<LeadScore> {
        if (!lead || !lead.id) {
            this.logOnce('Lead scoring requested without a valid lead id; using client-side fallback', 'missing-lead-id');
            return this.calculateLeadScoreClientSide(lead);
        }

        if (this.backendOfflineUntil && this.backendOfflineUntil > Date.now()) {
            this.logOnce('Skipping backend lead scoring while service is unavailable; using client-side fallback', 'backend-offline', 'info');
            return this.calculateLeadScoreClientSide(lead);
        }

        if (this.shouldSkipLeadBackendCall(lead.id)) {
            return this.calculateLeadScoreClientSide(lead);
        }

        let response: Response | null = null;
        let payload: any = null;

        try {
            response = await fetch(`/api/leads/${lead.id}/score`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            try {
                payload = await response.json();
            } catch {
                payload = null;
            }

            if (!response.ok || !payload?.score) {
                const errorInfo = this.extractErrorInfo(response, payload, 'Failed to calculate lead score');
                this.cacheLeadFailure(lead.id, errorInfo.message, errorInfo.status, errorInfo.code);
                const knownError: any = new Error(errorInfo.message);
                knownError.isLeadValidationError = true;
                throw knownError;
            }

            this.flushLeadFailure(lead.id);
            this.resetBackendOutageFlags();

            if (Array.isArray(payload.warnings) && payload.warnings.length > 0) {
                this.logOnce(
                    `Lead scoring warnings for ${lead.name || lead.id}: ${payload.warnings.join('; ')}`,
                    `lead-warn-${lead.id}`,
                    'info'
                );
            }

            return payload.score;
        } catch (error) {
            if ((error as any)?.isLeadValidationError) {
                return this.calculateLeadScoreClientSide(lead);
            }

            const message = error instanceof Error ? error.message : String(error);
            this.logOnce(`Backend lead scoring unavailable (${message}); using client-side fallback`, 'backend-scoring-unavailable');
            this.backendOfflineUntil = Date.now() + this.BACKEND_RETRY_DELAY_MS;
            return this.calculateLeadScoreClientSide(lead);
        }
    }

    // Fallback client-side calculation (kept for offline/error scenarios)
    static calculateLeadScoreClientSide(lead: Lead): LeadScore {
        const breakdown: ScoreBreakdown[] = [];
        let totalScore = 0;

        for (const rule of LEAD_SCORING_RULES) {
            if (rule.condition(lead)) {
                const appliedCount = 1;
                const points = rule.points * appliedCount;
                
                totalScore += points;
                breakdown.push({
                    ruleId: rule.id,
                    ruleName: rule.name,
                    points,
                    category: rule.category,
                    appliedCount
                });
            }
        }

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

    // Calculate scores for multiple leads with smarter fallbacks
    static async calculateBulkScores(leads: Lead[]): Promise<LeadScore[]> {
        if (!Array.isArray(leads) || leads.length === 0) {
            return [];
        }

        if (this.backendOfflineUntil && this.backendOfflineUntil > Date.now()) {
            this.logOnce('Skipping bulk scoring while backend is unavailable; using client-side fallback', 'bulk-backend-offline', 'info');
            return Promise.all(leads.map(async lead => this.calculateLeadScoreClientSide(lead)));
        }

        try {
            const response = await fetch('/api/leads/score-all', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    leadIds: leads.map(lead => lead?.id).filter((id): id is string => Boolean(id))
                })
            });

            let payload: any = null;
            try {
                payload = await response.json();
            } catch {
                payload = null;
            }

            if (!response.ok) {
                const errorInfo = this.extractErrorInfo(response, payload, 'Bulk scoring request failed');
                this.recordBulkFailures(payload);
                this.logOnce(`Bulk backend scoring failed: ${errorInfo.message}`, 'bulk-scoring-error');
                throw new Error(errorInfo.message);
            }

            this.recordBulkFailures(payload);
            this.resetBackendOutageFlags();

            if (Array.isArray(payload?.warnings)) {
                payload.warnings.forEach((warning: any) => {
                    if (warning?.leadId && Array.isArray(warning.warnings) && warning.warnings.length > 0) {
                        this.logOnce(
                            `Lead scoring warnings for ${warning.leadName || warning.leadId}: ${warning.warnings.join('; ')}`,
                            `lead-warn-${warning.leadId}`,
                            'info'
                        );
                    }
                });
            }

            const leadsResponse = await fetch('/api/admin/leads');
            let leadsPayload: any = null;
            try {
                leadsPayload = await leadsResponse.json();
            } catch {
                leadsPayload = null;
            }

            if (leadsResponse.ok && Array.isArray(leadsPayload?.leads)) {
                return leadsPayload.leads.map((lead: any) => ({
                    leadId: lead.id,
                    totalScore: lead.score || 0,
                    tier: lead.scoreTier || 'Cold',
                    breakdown: lead.scoreBreakdown || [],
                    lastUpdated: lead.scoreLastUpdated || lead.updatedAt
                }));
            }

            const fallbackInfo = this.extractErrorInfo(leadsResponse, leadsPayload, 'Failed to load scored leads');
            throw new Error(fallbackInfo.message);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logOnce(`Bulk scoring fallback engaged (${message})`, 'bulk-scoring-fallback');
            this.backendOfflineUntil = Date.now() + this.BACKEND_RETRY_DELAY_MS;
        }

        const scores = await Promise.all(
            leads.map(async lead => {
                try {
                    return await this.calculateLeadScore(lead);
                } catch {
                    return this.calculateLeadScoreClientSide(lead);
                }
            })
        );
        return scores;
    }

    // Get lead score from backend with caching of failure states
    static async getLeadScore(leadId: string): Promise<LeadScore | null> {
        const normalizedLeadId = leadId?.trim();
        if (!normalizedLeadId) {
            this.logOnce('Lead score lookup requested without an id', 'score-lookup-missing');
            return null;
        }

        if (this.shouldSkipLeadBackendCall(normalizedLeadId)) {
            return null;
        }

        try {
            const response = await fetch(`/api/leads/${normalizedLeadId}/score`);
            let payload: any = null;
            try {
                payload = await response.json();
            } catch {
                payload = null;
            }

            if (!response.ok || !payload?.score) {
                const errorInfo = this.extractErrorInfo(response, payload, 'Failed to load lead score');
                this.cacheLeadFailure(normalizedLeadId, errorInfo.message, errorInfo.status, errorInfo.code);
                const knownError: any = new Error(errorInfo.message);
                knownError.isLeadValidationError = true;
                throw knownError;
            }

            this.flushLeadFailure(normalizedLeadId);
            this.resetBackendOutageFlags();

            if (Array.isArray(payload.warnings) && payload.warnings.length > 0) {
                this.logOnce(
                    `Lead scoring warnings for ${payload.score?.leadId || normalizedLeadId}: ${payload.warnings.join('; ')}`,
                    `lead-warn-${normalizedLeadId}`,
                    'info'
                );
            }

            return payload.score;
        } catch (error) {
            if (!(error as any)?.isLeadValidationError) {
                const message = error instanceof Error ? error.message : String(error);
                this.logOnce(`Lead score lookup failed (${message})`, `score-lookup-error-${normalizedLeadId}`);
            }
            return null;
        }
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
