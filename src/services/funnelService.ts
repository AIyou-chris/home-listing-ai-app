import { EditableStep } from '../components/FunnelAnalyticsPanel';

const API_BASE = '/api/funnels';

export const funnelService = {
    async fetchFunnels(userId: string): Promise<Record<string, EditableStep[]>> {
        try {
            const response = await fetch(`${API_BASE}/${userId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch funnels');
            }
            const data = await response.json();
            return data.funnels || {};
        } catch (error) {
            console.error('Error fetching funnels:', error);
            return {};
        }
    },

    async saveFunnelStep(userId: string, funnelType: string, steps: EditableStep[]): Promise<boolean> {
        try {
            const response = await fetch(`${API_BASE}/${userId}/${funnelType}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ steps })
            });
            return response.ok;
        } catch (error) {
            console.error(`Error saving ${funnelType} funnel:`, error);
            return false;
        }
    }
};
