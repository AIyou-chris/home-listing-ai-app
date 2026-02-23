import { authService } from './authService';
import { CallBot } from '../types';

const API_BASE = '/api/admin/call-bots';
const DEFAULT_FOLLOWUP_CONFIG_ID = String(
    import.meta.env.VITE_VAPI_DEFAULT_ASSISTANT_ID ||
    import.meta.env.VITE_RETELL_DEFAULT_AGENT_ID ||
    import.meta.env.VITE_RETELL_AGENT_ID ||
    import.meta.env.VITE_HUME_ADMIN_FOLLOWUP_CONFIG_ID || 'd1d4d371-00dd-4ef9-8ab5-36878641b349'
).trim();

const demoStorageKey = (userId: string) => `hlai_demo_call_bots_${userId}`;

const fallbackBots = (userId?: string): CallBot[] => ([
    {
        id: `fallback-${userId || 'global'}-admin_follow_up`,
        userId: userId || null,
        key: 'admin_follow_up',
        name: 'Admin Follow-Up Bot',
        description: 'Default follow-up assistant',
        configId: DEFAULT_FOLLOWUP_CONFIG_ID,
        isActive: true,
        isDefault: true,
        isSystem: true,
        createdAt: null,
        updatedAt: null
    }
]);

type CreateCallBotInput = {
    name: string;
    key?: string;
    description?: string;
    configId: string;
    isActive?: boolean;
    isDefault?: boolean;
};

type UpdateCallBotInput = Partial<CreateCallBotInput>;

const isDemoUser = (userId: string) => userId === 'demo-blueprint' || userId.startsWith('demo-');

export const callBotsService = {
    async fetchCallBots(userId: string, includeInactive = true): Promise<CallBot[]> {
        if (!userId) return fallbackBots(userId);

        if (isDemoUser(userId)) {
            try {
                const raw = localStorage.getItem(demoStorageKey(userId));
                if (!raw) return fallbackBots(userId);
                const parsed = JSON.parse(raw);
                return Array.isArray(parsed) && parsed.length ? parsed : fallbackBots(userId);
            } catch {
                return fallbackBots(userId);
            }
        }

        try {
            const qs = new URLSearchParams({ userId, includeInactive: String(includeInactive) }).toString();
            const response = await authService.makeAuthenticatedRequest(`${API_BASE}?${qs}`, {
                headers: { 'x-user-id': userId }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch call bots');
            }
            const payload = await response.json();
            return payload?.bots || fallbackBots(userId);
        } catch (error) {
            console.error('fetchCallBots error:', error);
            return fallbackBots(userId);
        }
    },

    async createCallBot(userId: string, input: CreateCallBotInput): Promise<CallBot> {
        if (isDemoUser(userId)) {
            const bots = await this.fetchCallBots(userId, true);
            const bot: CallBot = {
                id: `demo-${Date.now()}`,
                userId,
                key: input.key || input.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''),
                name: input.name,
                description: input.description || '',
                configId: input.configId,
                isActive: input.isActive !== false,
                isDefault: Boolean(input.isDefault),
                isSystem: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            const next = bot.isDefault
                ? bots.map((b) => ({ ...b, isDefault: false })).concat(bot)
                : bots.concat(bot);
            localStorage.setItem(demoStorageKey(userId), JSON.stringify(next));
            return bot;
        }

        const response = await authService.makeAuthenticatedRequest(API_BASE, {
            method: 'POST',
            headers: { 'x-user-id': userId },
            body: JSON.stringify({ userId, ...input })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'Failed to create call bot');
        return payload.bot;
    },

    async updateCallBot(userId: string, botId: string, input: UpdateCallBotInput): Promise<CallBot> {
        if (isDemoUser(userId)) {
            const bots = await this.fetchCallBots(userId, true);
            const next = bots.map((bot) => {
                if (bot.id !== botId) return input.isDefault ? { ...bot, isDefault: false } : bot;
                const merged: CallBot = {
                    ...bot,
                    name: input.name ?? bot.name,
                    key: input.key ?? bot.key,
                    description: input.description ?? bot.description,
                    configId: input.configId ?? bot.configId,
                    isActive: input.isActive ?? bot.isActive,
                    isDefault: input.isDefault ?? bot.isDefault,
                    updatedAt: new Date().toISOString()
                };
                return merged;
            });
            localStorage.setItem(demoStorageKey(userId), JSON.stringify(next));
            const updated = next.find((bot) => bot.id === botId);
            if (!updated) throw new Error('Call bot not found');
            return updated;
        }

        const response = await authService.makeAuthenticatedRequest(`${API_BASE}/${botId}`, {
            method: 'PUT',
            headers: { 'x-user-id': userId },
            body: JSON.stringify({ userId, ...input })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'Failed to update call bot');
        return payload.bot;
    },

    async deleteCallBot(userId: string, botId: string): Promise<void> {
        if (isDemoUser(userId)) {
            const bots = await this.fetchCallBots(userId, true);
            const next = bots.filter((bot) => bot.id !== botId);
            localStorage.setItem(demoStorageKey(userId), JSON.stringify(next));
            return;
        }

        const response = await authService.makeAuthenticatedRequest(`${API_BASE}/${botId}?userId=${encodeURIComponent(userId)}`, {
            method: 'DELETE',
            headers: { 'x-user-id': userId }
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'Failed to delete call bot');
    }
};
