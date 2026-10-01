import { NotificationSettings } from '../types';
import { buildApiUrl } from '../lib/api';
import { supabase } from './supabase';

export interface NotificationChannelFlags {
    email_enabled: boolean;
    voice_enabled: boolean;
    sms_enabled: boolean;
}

interface NotificationSettingsResponse {
    success: boolean;
    settings?: NotificationSettings;
    smsChannel?: 'coming_soon' | 'active';
    channelFlags?: NotificationChannelFlags;
    error?: string;
}

const handleResponse = async (response: Response): Promise<NotificationSettingsResponse> => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
};


// These settings are owner-scoped on the backend, so every call carries the login token.
const authedHeaders = async (json = false): Promise<HeadersInit> => {
  const { data: { session } } = await supabase.auth.getSession();
  const { data } = await supabase.auth.getUser();
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(data.user?.id ? { 'x-user-id': data.user.id } : {}),
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
  };
};

const fetchSettings = async (userId: string): Promise<NotificationSettingsResponse> => {
    const safeId = userId || 'default';
    const response = await fetch(buildApiUrl(`/api/notifications/settings/${safeId}`), {
        headers: await authedHeaders()
    });
    return handleResponse(response);
};

const updateSettings = async (userId: string, settings: Partial<NotificationSettings>): Promise<NotificationSettingsResponse> => {
    const safeId = userId || 'default';
    const response = await fetch(buildApiUrl(`/api/notifications/settings/${safeId}`), {
        method: 'PATCH',
        headers: await authedHeaders(true),
        body: JSON.stringify(settings),
    });
    return handleResponse(response);
};

export const notificationSettingsService = {
    fetch: fetchSettings,
    update: updateSettings
};

export default notificationSettingsService;
