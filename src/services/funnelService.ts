import { authService } from './authService';
import { EditableStep } from '../types';

const API_BASE = '/api/funnels';

export const funnelService = {
    async fetchFunnels(userId: string): Promise<Record<string, EditableStep[]>> {
        // Mock for Demo/Blueprint Mode with Local Storage Persistence
        if (userId === 'demo-blueprint' || userId.startsWith('demo-')) {
            console.log('Using local storage funnels for demo user:', userId);
            try {
                const key = `hlai_demo_funnels_${userId}`;
                const saved = localStorage.getItem(key);
                return saved ? JSON.parse(saved) : {};
            } catch (e) {
                console.warn('Failed to load demo funnels from local storage', e);
                return {};
            }
        }

        try {
            // Use authenticated request for robust connectivity
            const response = await authService.makeAuthenticatedRequest(`${API_BASE}/${userId}`, {
                headers: { 'x-user-id': userId }
            });
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
        // Mock for Demo/Blueprint Mode with Local Storage Persistence
        if (userId === 'demo-blueprint' || userId.startsWith('demo-')) {
            console.log('Using local storage save for demo user:', userId);
            try {
                // Simulate network delay
                await new Promise(resolve => setTimeout(resolve, 500));

                // Get existing funnels to merge, or start fresh
                const key = `hlai_demo_funnels_${userId}`;
                const existingRaw = localStorage.getItem(key);
                const existing = existingRaw ? JSON.parse(existingRaw) : {};

                // Update specific funnel type
                existing[funnelType] = steps;

                localStorage.setItem(key, JSON.stringify(existing));
                console.log(`Saved demo funnel (${funnelType}) to local storage.`);
                return true;
            } catch (e) {
                console.error('Failed to save demo funnel to local storage', e);
                return false;
            }
        }

        try {
            // Use authenticated request for robust connectivity
            const response = await authService.makeAuthenticatedRequest(`${API_BASE}/${userId}/${funnelType}`, {
                method: 'POST',
                headers: { 'x-user-id': userId },
                body: JSON.stringify({ steps }) // Content-Type is auto-set by authService
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error(`Error saving ${funnelType} funnel:`, errorData);
                return false;
            }

            return true;
        } catch (error: unknown) {
            const err = error as Error;
            console.error(`Error saving ${funnelType} funnel:`, err);
            return false;
        }
    },

    async fetchSignature(userId: string): Promise<string> {
        try {
            const funnels = await this.fetchFunnels(userId);
            if (funnels.settings && funnels.settings.length > 0) {
                // Find the signature step
                const sigStep = funnels.settings.find(s => s.id === 'signature');
                return sigStep ? sigStep.content : '';
            }
            return '';
        } catch (error) {
            console.error('Error fetching signature:', error);
            return '';
        }
    },

    async saveSignature(userId: string, signature: string): Promise<boolean> {
        const settingsSteps: EditableStep[] = [{
            id: 'signature',
            title: 'Global Signature',
            description: 'Agent email signature',
            icon: 'badge',
            delay: '0',
            type: 'setting',
            subject: 'Signature',
            content: signature
        }];
        return this.saveFunnelStep(userId, 'settings', settingsSteps);
    }
};
