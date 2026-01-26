
export interface SecuritySettings {
    loginNotifications?: boolean;
    sessionTimeout?: number; // hours
    analyticsEnabled?: boolean;
    twoFactorEnabled?: boolean;
}

export interface SecuritySettingsResponse {
    success?: boolean;
    settings: SecuritySettings;
}

const handleResponse = async (response: Response): Promise<SecuritySettingsResponse> => {
    if (!response.ok) {
        const message = await response.text().catch(() => '');
        throw new Error(message || `Request failed with status ${response.status}`);
    }

    const data = (await response.json()) as SecuritySettingsResponse;

    if (!data || !data.settings) {
        // If no settings returned, return defaults essentially or throw? 
        // Usually we might want defaults.
        // But for now let's adhere to the contract.
        // If successful but no settings, it might be first time.
        if (data && data.success) return { success: true, settings: {} };
        throw new Error('Server did not return security settings');
    }

    return data;
};

const fetchSettings = async (userId: string): Promise<SecuritySettingsResponse> => {
    const safeId = userId || 'default';
    const response = await fetch(`/api/security/settings/${encodeURIComponent(safeId)}`);
    return handleResponse(response);
};

const updateSettings = async (
    userId: string,
    settings: SecuritySettings
): Promise<SecuritySettingsResponse> => {
    const safeId = userId || 'default';
    const response = await fetch(`/api/security/settings/${encodeURIComponent(safeId)}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
    });

    return handleResponse(response);
};

const notifyLogin = async (userId: string, email: string): Promise<boolean> => {
    try {
        const response = await fetch('/api/security/notify-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId,
                email,
                // We can't easily get IP here, backend will see request IP if behind proxy or direct
                userAgent: navigator.userAgent
            })
        });
        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('Failed to notify login', error);
        return false;
    }
};

export const securitySettingsService = {
    fetch: fetchSettings,
    update: updateSettings,
    notifyLogin
};

export default securitySettingsService;
