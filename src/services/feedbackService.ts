const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export interface FeedbackStats {
    sent: number;
    opened: number;
    clicked: number;
    replied: number;
    bounced: number;
}

export interface FeedbackAnalytics {
    [campaignId: string]: FeedbackStats;
}

export interface FeedbackEvent {
    id: string;
    type: 'open' | 'click' | 'reply' | 'bounce';
    timestamp: string;
    campaignId: string;
    metadata?: Record<string, unknown>;
}

export const feedbackService = {
    async fetchAnalytics(userId: string): Promise<FeedbackAnalytics> {
        try {
            const response = await fetch(`${API_BASE_URL}/api/analytics/feedback/${userId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch analytics');
            }
            const data = await response.json();
            return data.analytics || {};
        } catch (error) {
            console.error('Error fetching feedback analytics:', error);
            return {};
        }
    },

    async fetchStepPerformance(userId: string): Promise<StepPerformance[]> {
        try {
            const response = await fetch(`${API_BASE_URL}/api/analytics/step-performance/${userId}`);
            if (!response.ok) throw new Error('Failed to fetch step performance');
            const data = await response.json();
            return data.steps || [];
        } catch (error) {
            console.error('Error fetching step performance:', error);
            return [];
        }
    }
};

export interface StepPerformance {
    stepId: string;
    sent: number;
    opened: number;
    clicked: number;
    replied: number;
}
