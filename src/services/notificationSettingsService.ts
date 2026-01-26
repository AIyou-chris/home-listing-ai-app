import { NotificationSettings } from '../types';

interface NotificationSettingsResponse {
    success: boolean;
    settings?: NotificationSettings;
    error?: string;
}

const handleResponse = async (response: Response): Promise<NotificationSettingsResponse> => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
};

const fetchSettings = async (userId: string): Promise<NotificationSettingsResponse> => {
    const safeId = userId || 'default';
    const response = await fetch(`/api/notifications/settings/${safeId}`);
    return handleResponse(response);
};

const updateSettings = async (userId: string, settings: Partial<NotificationSettings>): Promise<NotificationSettingsResponse> => {
    const safeId = userId || 'default';
    const response = await fetch(`/api/notifications/settings/${safeId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
    });
    return handleResponse(response);
};

export const notificationSettingsService = {
    fetch: fetchSettings,
    update: updateSettings
};

export default notificationSettingsService;
