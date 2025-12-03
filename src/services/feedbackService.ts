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
    }
};
