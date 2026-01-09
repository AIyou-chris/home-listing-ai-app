import { authService } from './authService';
import { EditableStep } from '../components/FunnelAnalyticsPanel';

const API_BASE = '/api/funnels';

export const funnelService = {
    async fetchFunnels(userId: string): Promise<Record<string, EditableStep[]>> {
        // Mock for Demo/Blueprint Mode
        if (userId === 'demo-blueprint' || userId.startsWith('demo-')) {
            console.log('Using mock funnels for demo user:', userId);
            // Return empty or default structure to prevent 404
            return {};
        }

        try {
            // Use authenticated request for robust connectivity
            const response = await authService.makeAuthenticatedRequest(`${API_BASE}/${userId}`);
            if (!response.ok) {
                if (response.status === 404) return {}; // Handle "No funnels yet" gracefully
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
        // Mock for Demo/Blueprint Mode
        if (userId === 'demo-blueprint' || userId.startsWith('demo-')) {
            console.log('Mock saving funnel for demo user:', userId);
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 500));
            return true;
        }

        try {
            // Use authenticated request for robust connectivity
            const response = await authService.makeAuthenticatedRequest(`${API_BASE}/${userId}/${funnelType}`, {
                method: 'POST',
                body: JSON.stringify({ steps })
            });
            return response.ok;
        } catch (error) {
            console.error(`Error saving ${funnelType} funnel:`, error);
            return false;
        }
    }
};
