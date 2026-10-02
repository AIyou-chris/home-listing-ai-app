import { EmailSettings } from '../types';
import { authedFetch } from './authedFetch'

interface EmailSettingsResponse {
    success: boolean;
    settings?: EmailSettings;
    error?: string;
}

const handleResponse = async (response: Response): Promise<EmailSettingsResponse> => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
};

const fetchSettings = async (userId: string): Promise<EmailSettingsResponse> => {
    const safeId = userId || 'default';
    const response = await authedFetch(`/api/email/settings/${safeId}`);
    return handleResponse(response);
};

const updateSettings = async (userId: string, settings: Partial<EmailSettings>): Promise<EmailSettingsResponse> => {
    const safeId = userId || 'default';
    const response = await authedFetch(`/api/email/settings/${safeId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
    });
    return handleResponse(response);
};

export const emailSettingsService = {
    fetch: fetchSettings,
    update: updateSettings
};

export default emailSettingsService;
