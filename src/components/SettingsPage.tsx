import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AgentProfile, NotificationSettings, EmailSettings, CalendarSettings, BillingSettings } from '../types';
import { googleOAuthService } from '../services/googleOAuthService';
import { calendarSettingsService } from '../services/calendarSettingsService';
import { supabase } from '../services/supabase';
import { agentOnboardingService } from '../services/agentOnboardingService';

type EmailConnection = {
    provider: 'gmail' | 'outlook';
    email: string;
    connectedAt: string;
    status: 'active' | 'expired' | 'error';
};

interface SettingsPageProps {
    userId: string;
    userProfile: AgentProfile;
    onSaveProfile: (profile: AgentProfile) => void;
    notificationSettings: NotificationSettings;
    onSaveNotifications: (settings: NotificationSettings) => void;
    emailSettings: EmailSettings;
    onSaveEmailSettings: (settings: EmailSettings) => void;
    calendarSettings: CalendarSettings;
    onSaveCalendarSettings: (settings: CalendarSettings) => void;
    billingSettings: BillingSettings;
    onSaveBillingSettings: (settings: BillingSettings) => void;
    onBackToDashboard: () => void;
}

const TabButton: React.FC<{
    isActive: boolean;
    onClick: () => void;
    icon: string;
    children: React.ReactNode;
}> = ({ isActive, onClick, icon, children }) => {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
                isActive
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }`}
        >
            <span className="material-symbols-outlined w-5 h-5">{icon}</span>
            <span>{children}</span>
        </button>
    );
};

const FormInput: React.FC<{ label: string; id: string; } & React.InputHTMLAttributes<HTMLInputElement>> = ({ label, id, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
            {label}
        </label>
        <input
            id={id}
            {...props}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition"
        />
    </div>
);

const ToggleSwitch: React.FC<{
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    disabled?: boolean;
}> = ({ enabled, onChange, disabled }) => {
    return (
        <button
            type='button'
            role='switch'
            aria-checked={enabled}
            aria-disabled={disabled}
            disabled={disabled}
            onClick={() => {
                if (!disabled) {
                    onChange(!enabled);
                }
            }}
            className={`relative inline-flex flex-shrink-0 items-center h-6 rounded-full w-11 cursor-pointer transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                disabled
                    ? 'bg-slate-200 cursor-not-allowed opacity-60'
                    : enabled
                        ? 'bg-primary-600'
                        : 'bg-slate-300'
            }`}
        >
            <span
                aria-hidden='true'
                className={`inline-block w-4 h-4 transform bg-white rounded-full shadow-lg ring-0 transition-transform duration-200 ease-in-out ${
                    enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
        </button>
    )
}

const IntegrationCard: React.FC<{
    icon: string;
    title: string;
    description: string;
    tags: { label: string; color: 'green' | 'blue' | 'yellow' | 'red' | 'purple' }[];
    isSelected: boolean;
    onClick: () => void;
}> = ({ icon, title, description, tags, isSelected, onClick }) => {
    const tagColors = {
        green: 'bg-green-100 text-green-700',
        blue: 'bg-blue-100 text-blue-700',
        yellow: 'bg-yellow-100 text-yellow-700',
        red: 'bg-red-100 text-red-700',
        purple: 'bg-purple-100 text-purple-700',
    };

    return (
        <button
            type="button"
            onClick={onClick}
            className={`p-4 sm:p-5 text-left rounded-xl border-2 transition-all w-full h-full flex flex-col min-h-[140px] sm:min-h-[160px] ${
                isSelected 
                    ? 'border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-200' 
                    : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md hover:bg-slate-50 active:bg-slate-100'
            }`}
        >
            <div className="flex items-center gap-3 sm:gap-4 mb-3">
                <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center ${
                    isSelected ? 'bg-blue-500' : 'bg-slate-100'
                }`}>
                    <span className={`material-symbols-outlined w-5 h-5 sm:w-6 sm:h-6 ${
                        isSelected ? 'text-white' : 'text-slate-600'
                    }`}>{icon}</span>
                </div>
                <h4 className="text-base sm:text-lg font-bold text-slate-800">{title}</h4>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 flex-grow leading-relaxed">{description}</p>
            <div className="mt-3 sm:mt-4 flex items-center gap-2 flex-wrap">
                {tags.map(tag => (
                    <span key={tag.label} className={`px-2 py-1 text-xs font-semibold rounded-full ${tagColors[tag.color]}`}>
                        {tag.label}
                    </span>
                ))}
            </div>
        </button>
    );
};

const FeatureToggleRow: React.FC<{
    label: string;
    description: string;
    enabled: boolean;
    onToggle: (enabled: boolean) => void;
    disabled?: boolean;
}> = ({ label, description, enabled, onToggle, disabled }) => (
    <div className="flex justify-between items-center p-4 bg-slate-50/70 rounded-lg border border-slate-200">
        <div>
            <h4 className="font-semibold text-slate-800">{label}</h4>
            <p className="text-sm text-slate-500">{description}</p>
        </div>
        <ToggleSwitch enabled={enabled} onChange={onToggle} disabled={disabled} />
    </div>
);

const FeatureSection: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="mt-8 pt-8 border-t border-slate-200">
        <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined w-6 h-6 text-slate-500">{icon}</span>
            <h3 className="text-xl font-bold text-slate-900">{title}</h3>
        </div>
        <div className="space-y-4">{children}</div>
    </div>
);

type NotificationSettingKey = keyof NotificationSettings;

const NOTIFICATION_GROUPS: Array<{
    title: string;
    icon: string;
    items: Array<{ key: NotificationSettingKey; label: string; description: string }>;
}> = [
    {
        title: 'Real-time Alerts',
        icon: 'notifications_active',
        items: [
            {
                key: 'newLead',
                label: 'New lead arrives',
                description: 'Get pinged the moment a new lead hits your dashboard.'
            },
            {
                key: 'appointmentScheduled',
                label: 'Appointment scheduled',
                description: 'Receive confirmations when clients book time on your calendar.'
            },
            {
                key: 'aiInteraction',
                label: 'AI interaction updates',
                description: 'Alerts when your AI concierge jumps into a live conversation.'
            },
            {
                key: 'propertyInquiries',
                label: 'Property inquiries',
                description: 'Know instantly when a buyer requests info on your listings.'
            },
            {
                key: 'showingConfirmations',
                label: 'Showing confirmations',
                description: 'Confirmations and reminders when tours are booked or rescheduled.'
            }
        ]
    },
    {
        title: 'Follow-up Support',
        icon: 'event_available',
        items: [
            {
                key: 'appointmentReminders',
                label: 'Appointment reminders',
                description: 'We\'ll nudge you ahead of every booked consultation.'
            },
            {
                key: 'taskReminders',
                label: 'Task reminders',
                description: 'Stay on top of follow-ups with AI-generated tasks.'
            },
            {
                key: 'hotLeads',
                label: 'Hot lead alerts',
                description: 'Instant alerts when a lead hits "ready to tour" status.'
            },
            {
                key: 'priceChanges',
                label: 'Price change updates',
                description: 'Know right away when your active listings adjust pricing.'
            },
            {
                key: 'contractMilestones',
                label: 'Contract milestones',
                description: 'Stay informed as deals move from offer to close.'
            }
        ]
    },
    {
        title: 'Marketing & Insights',
        icon: 'insights',
        items: [
            {
                key: 'marketingUpdates',
                label: 'Marketing updates',
                description: 'Pipeline prompts when nurture sequences need attention.'
            },
            {
                key: 'weeklySummary',
                label: 'Weekly performance summary',
                description: 'Digest of lead activity, funnel performance, and AI wins.'
            },
            {
                key: 'weeklyReport',
                label: 'Weekly report email',
                description: 'Snapshot of traffic, conversions, and AI engagement.'
            },
            {
                key: 'monthlyInsights',
                label: 'Monthly insights',
                description: 'Deep-dive analytics delivered at month end.'
            }
        ]
    },
    {
        title: 'General Preferences',
        icon: 'tune',
        items: [
            {
                key: 'browserNotifications',
                label: 'Browser notifications',
                description: 'Enable in-browser alerts for urgent updates.'
            },
            {
                key: 'weekendNotifications',
                label: 'Weekend notifications',
                description: 'Mute non-critical alerts on weekends to stay focused.'
            }
        ]
    }
];

const SettingsPage: React.FC<SettingsPageProps> = ({ userId, userProfile, onSaveProfile: _onSaveProfile, notificationSettings, onSaveNotifications: _onSaveNotifications, emailSettings, onSaveEmailSettings: _onSaveEmailSettings, calendarSettings, onSaveCalendarSettings: _onSaveCalendarSettings, billingSettings: _billingSettings, onSaveBillingSettings: _onSaveBillingSettings, onBackToDashboard: _onBackToDashboard }) => {
    const [activeTab, setActiveTab] = useState<'notifications' | 'email' | 'calendar' | 'security' | 'billing'>('notifications');
    const [emailFormData, setEmailFormData] = useState<EmailSettings>(emailSettings);
    const [calendarFormData, setCalendarFormData] = useState<CalendarSettings>(calendarSettings);
    const [currentNotifications, setCurrentNotifications] = useState<NotificationSettings>(notificationSettings);
    const [isNotificationsLoading, setIsNotificationsLoading] = useState<boolean>(true);
    const [isNotificationsSaving, setIsNotificationsSaving] = useState<boolean>(false);
    const [notificationSaveError, setNotificationSaveError] = useState<string | null>(null);
    const [showNotificationTips, setShowNotificationTips] = useState(true);
    const [showEmailTips, setShowEmailTips] = useState(true);
    const [showCalendarTips, setShowCalendarTips] = useState(true);
    const [showBillingTips, setShowBillingTips] = useState(true);
    const [paymentProviders, setPaymentProviders] = useState<string[]>([]);
    const [isBillingCheckoutLoading, setIsBillingCheckoutLoading] = useState(false);
    const [billingMessage, setBillingMessage] = useState<string | null>(null);
    const [billingError, setBillingError] = useState<string | null>(null);
    const [isGoogleIntegrationAvailable, setIsGoogleIntegrationAvailable] = useState(false);
    const [passwords, setPasswords] = useState({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
    });
    
    // Email connection state
    const [emailConnections, setEmailConnections] = useState<EmailConnection[]>([]);
    const [isConnecting, setIsConnecting] = useState<string | null>(null);
    const [isEmailSettingsLoading, setIsEmailSettingsLoading] = useState<boolean>(true);
    const [isEmailSettingsSaving, setIsEmailSettingsSaving] = useState<boolean>(false);
    const [emailSettingsError, setEmailSettingsError] = useState<string | null>(null);
    const [emailSaveMessage, setEmailSaveMessage] = useState<string | null>(null);
    const [isCalendarSettingsLoading, setIsCalendarSettingsLoading] = useState<boolean>(false);
    const [isCalendarSettingsSaving, setIsCalendarSettingsSaving] = useState<boolean>(false);
    const [calendarSettingsError, setCalendarSettingsError] = useState<string | null>(null);
    const [calendarSettingsMessage, setCalendarSettingsMessage] = useState<string | null>(null);
    const [isSecuritySaving, setIsSecuritySaving] = useState<boolean>(false);
    const [securityError, setSecurityError] = useState<string | null>(null);
    const [securityMessage, setSecurityMessage] = useState<string | null>(null);
    const forwardingAddress = useMemo(() => {
        const baseEmail = emailFormData.fromEmail || userProfile.email || 'agent@homelistingai.com';
        const localPart = (baseEmail.split('@')[0] || 'agent').toLowerCase();
        const safeLocalPart = localPart.replace(/[^a-z0-9]/g, '') || 'agent';
        return `agent-${safeLocalPart}@homelistingai.com`;
    }, [emailFormData.fromEmail, userProfile.email]);
    const oauthPopupRef = useRef<Window | null>(null);
    const calendarDefaultsRef = useRef<CalendarSettings>(calendarSettings);
    const isMountedRef = useRef(true);

    useEffect(() => {
        calendarDefaultsRef.current = calendarSettings;
    }, [calendarSettings]);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const applyEmailSettings = useCallback(
        (settings: EmailSettings, connections: EmailConnection[]) => {
            setEmailFormData(settings);
            setEmailConnections(connections);
            _onSaveEmailSettings(settings);
        },
        [_onSaveEmailSettings]
    );

    const fetchEmailSettings = useCallback(async () => {
        const response = await fetch(`/api/email/settings/${encodeURIComponent(userId)}`);
        if (!response.ok) {
            const message = await response.text().catch(() => '');
            throw new Error(message || `Request failed with status ${response.status}`);
        }

        return response.json();
    }, [userId]);

    const reloadEmailSettings = useCallback(
        async ({ showLoading = false, showMessage = false }: { showLoading?: boolean; showMessage?: boolean } = {}) => {
            setEmailSettingsError(null);
            if (showLoading) {
                setIsEmailSettingsLoading(true);
                setEmailSaveMessage(null);
            }

            try {
                const data = await fetchEmailSettings();
                const nextSettings = (data?.settings as EmailSettings) || emailFormData;
                const nextConnections = (data?.connections as EmailConnection[]) || [];
                applyEmailSettings(nextSettings, nextConnections);

                if (showMessage) {
                    setEmailSaveMessage('Email settings updated.');
                }
            } catch (error) {
                console.error('Failed to load email settings:', error);
                setEmailSettingsError(
                    error instanceof Error
                        ? error.message
                        : 'Unable to load email settings. Please try again.'
                );
                if (showLoading) {
                    setEmailFormData(emailFormData);
                    setEmailConnections([]);
                }
            } finally {
                if (showLoading) {
                    setIsEmailSettingsLoading(false);
                }
            }
        },
        [applyEmailSettings, emailFormData, fetchEmailSettings]
    );

    const loadCalendarSettings = useCallback(
        async ({ showLoading = true }: { showLoading?: boolean } = {}) => {
            if (!isMountedRef.current) {
                return calendarDefaultsRef.current;
            }

            if (showLoading) {
                setIsCalendarSettingsLoading(true);
            }
            setCalendarSettingsError(null);
            setCalendarSettingsMessage(null);

            try {
                const payload = await calendarSettingsService.fetch(userId);
                const nextSettings = (payload?.settings as CalendarSettings) || calendarDefaultsRef.current;

                if (!isMountedRef.current) {
                    return nextSettings;
                }

                calendarDefaultsRef.current = nextSettings;
                setCalendarFormData(nextSettings);
                _onSaveCalendarSettings(nextSettings);
                setIsGoogleCalendarConnected(Boolean(payload?.connection && payload.connection.status === 'active'));
                return nextSettings;
            } catch (error) {
                console.error('Failed to load calendar settings:', error);
                if (isMountedRef.current) {
                    setCalendarSettingsError('Unable to load calendar settings. Using defaults for now.');
                    setCalendarFormData(calendarDefaultsRef.current);
                }
                return calendarDefaultsRef.current;
            } finally {
                if (showLoading && isMountedRef.current) {
                    setIsCalendarSettingsLoading(false);
                }
            }
        },
        [_onSaveCalendarSettings, userId]
    );
    
    // Calendar connection state
    const [isGoogleCalendarConnected, setIsGoogleCalendarConnected] = useState(false);
    
    // Security settings state
    const [securitySettings, setSecuritySettings] = useState({
        loginNotifications: true,
        sessionTimeout: 24,
        analyticsEnabled: true
    });
    
    useEffect(() => {
        let isActive = true;

        const loadPreferences = async () => {
            setIsNotificationsLoading(true);
            setNotificationSaveError(null);

            try {
                const response = await fetch(`/api/notifications/preferences/${encodeURIComponent(userId)}`);
                if (!response.ok) {
                    throw new Error(`Request failed with status ${response.status}`);
                }

                const data = await response.json();
                if (!isActive) return;

                if (data?.preferences) {
                    setCurrentNotifications(data.preferences as NotificationSettings);
                    _onSaveNotifications(data.preferences as NotificationSettings);
                } else {
        setCurrentNotifications(notificationSettings);
                }
            } catch (error) {
                console.error('Failed to load notification preferences:', error);
                if (isActive) {
                    setNotificationSaveError('Unable to load notification preferences. Using defaults for now.');
                    setCurrentNotifications(notificationSettings);
                }
            } finally {
                if (isActive) {
                    setIsNotificationsLoading(false);
                }
            }
        };

        void loadPreferences();

        return () => {
            isActive = false;
        };
    }, [userId, notificationSettings, _onSaveNotifications]);


    useEffect(() => {
        setCurrentNotifications(notificationSettings);
    }, [notificationSettings]);

    useEffect(() => {
        setIsGoogleIntegrationAvailable(googleOAuthService.isAvailable);
        setIsGoogleCalendarConnected(googleOAuthService.isAuthenticated('calendar'));
    }, []);

    useEffect(() => {
        void loadCalendarSettings({ showLoading: true });
    }, [loadCalendarSettings]);

    useEffect(() => {
        let isMounted = true;
        const loadProviders = async () => {
            try {
                const providers = await agentOnboardingService.listPaymentProviders();
                if (!isMounted) return;
                setPaymentProviders(providers);
            } catch (error) {
                console.warn('Failed to load payment providers:', error);
            }
        };

        void loadProviders();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setIsEmailSettingsLoading(true);
            setEmailSettingsError(null);
            setEmailSaveMessage(null);

            try {
                const data = await fetchEmailSettings();
                if (cancelled) return;

                const nextSettings = (data?.settings as EmailSettings) || emailFormData;
                const nextConnections = (data?.connections as EmailConnection[]) || [];
                applyEmailSettings(nextSettings, nextConnections);
            } catch (error) {
                console.error('Failed to load email settings:', error);
                if (!cancelled) {
                    setEmailSettingsError('Unable to load email settings. Using defaults for now.');
                    setEmailFormData(emailFormData);
                    setEmailConnections([]);
                }
            } finally {
                if (!cancelled) {
                    setIsEmailSettingsLoading(false);
                }
            }
        };

        void load();

        return () => {
            cancelled = true;
        };
    }, [applyEmailSettings, emailFormData, fetchEmailSettings]);

    // Email connection handlers
    const handleGmailConnect = async () => {
        setIsConnecting('gmail');
        setEmailSettingsError(null);
        setEmailSaveMessage(null);

        try {
            const response = await fetch(`/api/email/google/oauth-url?userId=${encodeURIComponent(userId)}`);

            if (response.status === 503) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload?.error || 'Google OAuth is not configured.');
            }

            if (!response.ok) {
                throw new Error(`Request failed with status ${response.status}`);
            }

            const data = await response.json();
            if (!data?.url) {
                throw new Error('Failed to receive OAuth URL.');
            }

            const popup = window.open(
                data.url,
                'gmail-oauth',
                'width=480,height=720,menubar=no,toolbar=no,status=no'
            );

            if (!popup) {
                throw new Error('Popup blocked. Please allow popups to connect Gmail.');
            }

            oauthPopupRef.current = popup;
        } catch (error) {
            console.error('Gmail OAuth launch failed:', error);
            setEmailSettingsError(
                error instanceof Error ? error.message : 'Failed to start Google OAuth.'
            );
            setIsConnecting(null);
            oauthPopupRef.current?.close();
            oauthPopupRef.current = null;
        }
    };

    const handleEmailDisconnect = async (provider: 'gmail' | 'outlook') => {
        setIsConnecting(provider);
        setEmailSettingsError(null);
        setEmailSaveMessage(null);

        try {
            const response = await fetch(`/api/email/settings/${encodeURIComponent(userId)}/connections/${provider}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`Request failed with status ${response.status}`);
            }

            const data = await response.json();
            const nextConnections = (data?.connections as EmailConnection[]) || [];
            const nextSettings = (data?.settings as EmailSettings) || emailFormData;
            setEmailConnections(nextConnections);
            setEmailFormData(nextSettings);
            _onSaveEmailSettings(nextSettings);
            setEmailSaveMessage('Email connection removed.');
        } catch (error) {
            console.error('Disconnect failed:', error);
            setEmailSettingsError('Failed to disconnect email provider. Please try again.');
        } finally {
            setIsConnecting(null);
        }
    };

    // Calendar connection handlers
    const handleGoogleCalendarConnect = async () => {
        setIsConnecting('google');
        try {
            if (!googleOAuthService.isAvailable) {
                setCalendarSettingsError('Google Calendar integration is not available in this environment.');
                return;
            }

            const success = await googleOAuthService.requestAccess({ userId, context: 'calendar' });
            if (success) {
                setIsGoogleCalendarConnected(true);
                setCalendarSettingsError(null);
                setCalendarSettingsMessage('Google Calendar connected successfully.');
                await loadCalendarSettings({ showLoading: false });
            } else {
                setIsGoogleCalendarConnected(false);
                setCalendarSettingsError('Failed to connect Google Calendar. Please try again.');
            }
        } catch (error) {
            console.error('Google Calendar connection failed:', error);
            setIsGoogleCalendarConnected(false);
            setCalendarSettingsError('Failed to connect Google Calendar. Please try again.');
        } finally {
            setIsConnecting(null);
        }
    };

    const handleCalendarInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setCalendarSettingsMessage(null);
        setCalendarSettingsError(null);
        if (name === 'startTime' || name === 'endTime') {
            const key = name === 'startTime' ? 'start' : 'end';
            setCalendarFormData(prev => ({
                ...prev,
                workingHours: {
                    ...prev.workingHours,
                    [key]: value
                }
            }));
        } else {
            setCalendarFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleWorkingDayToggle = (day: string, checked: boolean) => {
        setCalendarSettingsMessage(null);
        setCalendarSettingsError(null);
        setCalendarFormData(prev => {
            const workingDays = prev.workingDays || [];
            if (checked) {
                return {
                    ...prev,
                    workingDays: [...workingDays, day]
                };
            } else {
                return {
                    ...prev,
                    workingDays: workingDays.filter(d => d !== day)
                };
            }
        });
    };

    const handleCalendarToggle = (setting: keyof CalendarSettings, value: boolean) => {
        setCalendarSettingsMessage(null);
        setCalendarSettingsError(null);
        setCalendarFormData(prev => ({
            ...prev,
            [setting]: value
        }));
    };

    const handleCalendarSettingsSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isCalendarSettingsSaving) {
            return;
        }

        setIsCalendarSettingsSaving(true);
        setCalendarSettingsError(null);
        setCalendarSettingsMessage(null);

        try {
            const payload = await calendarSettingsService.update(userId, calendarFormData);
            const nextSettings = (payload?.settings as CalendarSettings) || calendarFormData;
            calendarDefaultsRef.current = nextSettings;
            setCalendarFormData(nextSettings);
            _onSaveCalendarSettings(nextSettings);
            setIsGoogleCalendarConnected(Boolean(payload?.connection && payload.connection.status === 'active'));
            setCalendarSettingsMessage('Calendar settings saved successfully.');
        } catch (error) {
            console.error('Failed to save calendar settings:', error);
            setCalendarSettingsError('Failed to save calendar settings. Please try again.');
        } finally {
            setIsCalendarSettingsSaving(false);
        }
    };

    // Security handlers
    const handlePasswordSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!isPasswordValid) {
            alert('Please check password requirements');
            return;
        }
        
        try {
            // Here you would integrate with your authentication service
            // For now, we'll simulate the password change
            console.log('Password change request:', {
                currentPassword: passwords.currentPassword,
                newPassword: passwords.newPassword
            });
            
            // Reset form
            setPasswords({
                currentPassword: '',
                newPassword: '',
                confirmNewPassword: ''
            });
            
            alert('Password updated successfully!');
        } catch (error) {
            console.error('Password update failed:', error);
            alert('Failed to update password. Please try again.');
        }
    };

    const handleSecurityToggle = (setting: string, value: boolean | number) => {
        setSecuritySettings(prev => ({
            ...prev,
            [setting]: value
        }));
    };

    const handleSecuritySettingsSave = () => {
        // Here you would save security settings to your backend
        console.log('Saving security settings:', securitySettings);
        alert('Security settings saved successfully!');
    };

    // Password validation
    const isPasswordValid = 
        passwords.newPassword.length >= 8 &&
        /[A-Z]/.test(passwords.newPassword) &&
        /[0-9]/.test(passwords.newPassword) &&
        /[^A-Za-z0-9]/.test(passwords.newPassword) &&
        passwords.newPassword === passwords.confirmNewPassword &&
        passwords.currentPassword.length > 0;

    const openCheckoutUrl = (url: string) => {
        const target = window.open(url, '_blank', 'noopener,noreferrer');
        if (!target) {
            window.location.href = url;
        }
    };

    const launchBillingCheckout = async (provider: 'stripe' | 'paypal') => {
        if (!userId) {
            setBillingError('Missing account identifier. Please refresh and try again.');
            return;
        }

        setBillingError(null);
        setBillingMessage(null);
        setIsBillingCheckoutLoading(true);

        try {
            const session = await agentOnboardingService.createCheckoutSession({
                slug: userId,
                provider
            });

            if (session?.url) {
                openCheckoutUrl(session.url);
                setBillingMessage(provider === 'paypal'
                    ? 'Opening PayPal subscription checkout in a new tab.'
                    : 'Opening checkout in a new tab.');
            } else {
                setBillingError('Checkout session did not return a redirect URL.');
            }
        } catch (error) {
            console.error('Billing checkout failed:', error);
            setBillingError(error instanceof Error ? error.message : 'Unable to start checkout. Please try again.');
        } finally {
            setIsBillingCheckoutLoading(false);
        }
    };

    // Billing handlers
    const handlePayPalCheckout = () => {
        if (!paypalAvailable) {
            setBillingError('PayPal is not available. Please contact support.');
            return;
        }

        void launchBillingCheckout('paypal');
    };

    const handleContactSupport = () => {
        window.open('mailto:support@homelistingai.com?subject=Billing Support Request', '_blank');
    };

    const handleCancelMembership = () => {
        const confirmed = confirm('Are you sure you want to cancel your membership? You will lose access to all AI features at the end of your current billing period.');
        if (confirmed) {
            alert('Cancellation request submitted. You will receive a confirmation email shortly.');
        }
    };

    const handleNotificationToggle = useCallback(
        async (key: keyof NotificationSettings, value: boolean) => {
            const previousValue = currentNotifications[key];
            const optimistic = { ...currentNotifications, [key]: value };

            setCurrentNotifications(optimistic);
            setNotificationSaveError(null);
            setIsNotificationsSaving(true);

            try {
                const response = await fetch(`/api/notifications/preferences/${encodeURIComponent(userId)}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ [key]: value })
                });

                if (!response.ok) {
                    throw new Error(`Request failed with status ${response.status}`);
                }

                const data = await response.json();
                const nextPreferences = (data?.preferences as NotificationSettings) || optimistic;
                setCurrentNotifications(nextPreferences);
                _onSaveNotifications(nextPreferences);
        } catch (error) {
                console.error('Failed to update notification preference:', error);
                setNotificationSaveError('Failed to save notification preference. Please try again.');
                setCurrentNotifications((prev) => {
                    const reverted = { ...prev, [key]: previousValue };
                    _onSaveNotifications(reverted);
                    return reverted;
                });
        } finally {
                setIsNotificationsSaving(false);
            }
        },
        [currentNotifications, userId, _onSaveNotifications]
    );

    const handleEmailSettingsChange = <K extends keyof EmailSettings>(field: K, value: EmailSettings[K]) => {
        setEmailFormData(prev => ({ ...prev, [field]: value }));
        setEmailSaveMessage(null);
        setEmailSettingsError(null);
    }

    const handleEmailSettingsSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsEmailSettingsSaving(true);
        setEmailSettingsError(null);
        setEmailSaveMessage(null);

        try {
            const response = await fetch(`/api/email/settings/${encodeURIComponent(userId)}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(emailFormData)
            });

            if (!response.ok) {
                throw new Error(`Request failed with status ${response.status}`);
            }

            const data = await response.json();
            const nextSettings = (data?.settings as EmailSettings) || emailFormData;
            setEmailFormData(nextSettings);
            _onSaveEmailSettings(nextSettings);
            setEmailSaveMessage('Email settings saved.');
        } catch (error) {
            console.error('Failed to save email settings:', error);
            setEmailSettingsError('Failed to save email settings. Please try again.');
        } finally {
            setIsEmailSettingsSaving(false);
        }
    }

    const handleCalendarSettingsChange = <K extends keyof CalendarSettings>(field: K, value: CalendarSettings[K]) => {
        setCalendarSettingsMessage(null);
        setCalendarSettingsError(null);
        setCalendarFormData(prev => ({ ...prev, [field]: value }));
    }

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSecurityError(null);
        setSecurityMessage(null);
        setPasswords(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        setSecurityError(null);
        setSecurityMessage(null);

        const current = passwords.currentPassword.trim();
        const next = passwords.newPassword.trim();
        const confirm = passwords.confirmNewPassword.trim();

        if (!current || !next) {
            setSecurityError('Please enter your current password and choose a new password.');
            return;
        }

        if (next !== confirm) {
            setSecurityError('New passwords do not match.');
            return;
        }

        if (next.length < 8) {
            setSecurityError('Password must be at least 8 characters.');
            return;
        }

        setIsSecuritySaving(true);

        try {
            const { data: { user }, error: sessionError } = await supabase.auth.getUser();
            if (sessionError || !user?.email) {
                throw new Error('Unable to verify your session. Please sign in again.');
            }

            const email = user.email || userProfile.email;
            if (!email) {
                throw new Error('No email associated with this account.');
            }

            const { error: verifyError } = await supabase.auth.signInWithPassword({
                email,
                password: current
            });

            if (verifyError) {
                setSecurityError('Current password is incorrect.');
                return;
            }

            const { error: updateError } = await supabase.auth.updateUser({ password: next });
            if (updateError) {
                throw updateError;
            }

            setSecurityMessage('Password updated successfully.');
            setPasswords({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update password. Please try again.';
            setSecurityError(message);
        } finally {
            setIsSecuritySaving(false);
        }
    };

    
    const tabs = [
        { id: 'notifications', label: 'Notifications', icon: 'notifications' },
        { id: 'email', label: 'Email', icon: 'mail' },
        { id: 'calendar', label: 'Calendar', icon: 'calendar_today' },
        { id: 'security', label: 'Security', icon: 'shield' },
        { id: 'billing', label: 'Billing', icon: 'credit_card' },
    ];

    const paypalAvailable = paymentProviders.includes('paypal');

    useEffect(() => {
        const listener = (event: MessageEvent) => {
            const data = event?.data;
            if (!data || typeof data !== 'object') {
                return;
            }

            if (data.type === 'gmail-oauth-success') {
                if (data.userId && data.userId !== userId) {
                    return;
                }

                oauthPopupRef.current?.close();
                oauthPopupRef.current = null;
                setIsConnecting(null);
                setEmailSettingsError(null);
                setEmailSaveMessage('Gmail connected successfully.');
                void reloadEmailSettings({ showLoading: false });
            } else if (data.type === 'gmail-oauth-error') {
                oauthPopupRef.current?.close();
                oauthPopupRef.current = null;
                setIsConnecting(null);
                setEmailSettingsError(data.reason || 'Failed to connect Gmail.');
            } else if (data.type === 'calendar-oauth-success') {
                if (data.userId && data.userId !== userId) {
                    return;
                }

                oauthPopupRef.current?.close();
                oauthPopupRef.current = null;
                setIsConnecting(null);
                setIsGoogleCalendarConnected(true);
                setCalendarSettingsError(null);
                setCalendarSettingsMessage('Google Calendar connected successfully.');
                setCalendarFormData(prev => ({
                    ...prev,
                    integrationType: 'google'
                }));
                void loadCalendarSettings({ showLoading: false });
            } else if (data.type === 'calendar-oauth-error') {
                oauthPopupRef.current?.close();
                oauthPopupRef.current = null;
                setIsConnecting(null);
                setIsGoogleCalendarConnected(false);
                setCalendarSettingsError('Failed to connect Google Calendar. Please try again.');
            }
        };

        window.addEventListener('message', listener);
        return () => window.removeEventListener('message', listener);
    }, [reloadEmailSettings, loadCalendarSettings, userId]);

    return (
        <div className="py-10 px-4 sm:px-6 lg:px-0">
             <button onClick={_onBackToDashboard} className="flex items-center space-x-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors mb-6">
                <span className="material-symbols-outlined w-5 h-5">chevron_left</span>
                <span>Back to Dashboard</span>
            </button>
            <div className="w-full bg-white rounded-xl lg:rounded-none shadow-lg border border-slate-200/60">
                <div className="flex flex-col md:flex-row">
                    {/* Sidebar Navigation */}
                    <aside className="md:w-64 p-6 border-b md:border-b-0 md:border-r border-slate-200/80">
                         <h2 className="text-lg font-bold text-slate-800 mb-4">Settings</h2>
                        <nav className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-x-visible -mx-3 px-3 md:mx-0 md:px-0">
                            {tabs.map(tab => (
                                <TabButton
                                    key={tab.id}
                                    isActive={activeTab === tab.id}
                                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                                    icon={tab.icon}
                                >
                                    {tab.label}
                                </TabButton>
                            ))}
                        </nav>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1">
                        {activeTab === 'notifications' && (
                            <div className="p-8 space-y-8">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">🔔 Notification Settings</h2>
                                    <p className="text-slate-500 mt-1">Customize how and when you receive notifications.</p>
                                </div>
                                <div className="bg-white border border-primary-100 rounded-xl shadow-sm">
                                    <button
                                        type="button"
                                        onClick={() => setShowNotificationTips((prev) => !prev)}
                                        className="flex items-center gap-2 w-full px-5 py-3 text-sm font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 transition-colors rounded-t-xl"
                                        aria-expanded={showNotificationTips}
                                    >
                                        <span className="material-symbols-outlined text-xl">{showNotificationTips ? 'psychiatry' : 'tips_and_updates'}</span>
                                        {showNotificationTips ? 'Hide Notification Tips' : 'Show Notification Tips'}
                                        <span className="material-symbols-outlined text-base ml-auto">{showNotificationTips ? 'expand_less' : 'expand_more'}</span>
                                    </button>
                                    {showNotificationTips && (
                                        <div className="px-5 pb-5 pt-4 border-t border-primary-100">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-600">
                                                <div className="bg-primary-50 border border-primary-100 rounded-lg p-3">
                                                    <p className="font-semibold text-primary-700 mb-1">Lead Coverage</p>
                                                    <p>Keep new lead emails and push alerts on so fresh inquiries never wait—fast handoffs boost conversions.</p>
                                                </div>
                                                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                                                    <p className="font-semibold text-blue-700 mb-1">Task Accountability</p>
                                                    <p>Pair task notifications with the AI follow-up timeline so agents clear their queue before automations fire again.</p>
                                                </div>
                                                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                                                    <p className="font-semibold text-amber-700 mb-1">Channel Balance</p>
                                                    <p>Use email for summaries and push/in-app for urgent actions—overlapping alerts on every channel creates fatigue.</p>
                                                </div>
                                                <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                                                    <p className="font-semibold text-green-700 mb-1">Marketing Momentum</p>
                                                    <p>Leave marketing updates enabled so you'll know when sequences pause or new automations are ready to launch.</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {isNotificationsLoading ? (
                                    <div className="px-5 py-12 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-sm text-slate-500">
                                                <div className="flex items-center gap-3">
                                            <div className="w-4 h-4 border-2 border-slate-300 border-t-primary-500 rounded-full animate-spin" />
                                            Loading your preferences…
                                                    </div>
                                                </div>
                                ) : (
                                    <>
                                        {notificationSaveError && (
                                            <div className="px-5 py-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                                                {notificationSaveError}
                                            </div>
                                        )}
                                        {isNotificationsSaving && (
                                            <div className="px-5 py-3 bg-primary-50 border border-primary-200 rounded-lg text-sm text-primary-700 flex items-center gap-2">
                                                <div className="w-3 h-3 border-2 border-primary-300 border-t-primary-700 rounded-full animate-spin" />
                                                Saving your changes…
                                    </div>
                                        )}

                                        {NOTIFICATION_GROUPS.map((group) => (
                                            <FeatureSection key={group.title} title={group.title} icon={group.icon}>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {group.items.map((item) => (
                                                        <FeatureToggleRow
                                                            key={item.key}
                                                            label={item.label}
                                                            description={item.description}
                                                            enabled={currentNotifications[item.key]}
                                                            onToggle={(value) => handleNotificationToggle(item.key, value)}
                                                            disabled={isNotificationsSaving}
                                                        />
                                                    ))}
                                    </div>
                                </FeatureSection>
                                        ))}
                                    </>
                                )}
                            </div>
                        )}
                        {activeTab === 'email' && (
                           <form onSubmit={handleEmailSettingsSave} className="p-8 space-y-8">
                                <div>
                                   <h2 className="text-2xl font-bold text-slate-900">📧 Email Settings</h2>
                                   <p className="text-slate-500 mt-1">Connect your email accounts and configure your email preferences for automated sequences.</p>
                                </div>
                                <div className="bg-white border border-primary-100 rounded-xl shadow-sm">
                                    <button
                                        type="button"
                                        onClick={() => setShowEmailTips(prev => !prev)}
                                        className="flex items-center gap-2 w-full px-5 py-3 text-sm font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 transition-colors rounded-t-xl"
                                        aria-expanded={showEmailTips}
                                    >
                                        <span className="material-symbols-outlined text-xl">{showEmailTips ? 'psychiatry' : 'tips_and_updates'}</span>
                                        {showEmailTips ? 'Hide Email Tips' : 'Show Email Tips'}
                                        <span className="material-symbols-outlined text-base ml-auto">{showEmailTips ? 'expand_less' : 'expand_more'}</span>
                                    </button>
                                    {showEmailTips && (
                                        <div className="px-5 pb-5 pt-4 border-t border-primary-100">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-600">
                                                <div className="bg-primary-50 border border-primary-100 rounded-lg p-3">
                                                    <p className="font-semibold text-primary-700 mb-1">Keep it personal</p>
                                                    <p>Use the same display name and signature you use with clients so automated emails feel human.</p>
                                                </div>
                                                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                                                    <p className="font-semibold text-blue-700 mb-1">Forwarding fallback</p>
                                                    <p>Until Gmail OAuth ships, the forwarding address keeps sending/receiving 100% from your main inbox.</p>
                                                </div>
                                                <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                                                    <p className="font-semibold text-green-700 mb-1">Reply tracking</p>
                                                    <p>Forwarded replies land in your normal inbox. Keep notifications on so you never miss a response.</p>
                                                </div>
                                                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                                                    <p className="font-semibold text-amber-700 mb-1">Preview before live</p>
                                                    <p>Send yourself the preview email after edits—double-check links, signature, and merge fields first.</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {isEmailSettingsLoading ? (
                                    <div className="px-6 py-12 bg-white border border-slate-200 rounded-lg text-sm text-slate-500 flex items-center justify-center">
                                        <div className="flex items-center gap-3">
                                            <div className="w-4 h-4 border-2 border-slate-300 border-t-primary-500 rounded-full animate-spin" />
                                            Loading your email settings…
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {emailSettingsError && (
                                            <div className="px-6 py-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                                                {emailSettingsError}
                                            </div>
                                        )}
                                        {emailSaveMessage && (
                                            <div className="px-6 py-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                                                {emailSaveMessage}
                                            </div>
                                        )}

                                {/* Email Account Connections */}
                                <div className="bg-white rounded-lg border border-slate-200 p-6">
                                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Email Account Connections</h3>
                                    <p className="text-sm text-slate-600 mb-4">
                                        Connect your email accounts to send follow-up sequences and automated emails directly from your own inbox.
                                    </p>
                                    
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                                <h4 className="text-sm font-semibold text-blue-800 mb-2">🔐 Direct Connection (Recommended)</h4>
                                                <div className="text-xs text-blue-700 space-y-1">
                                                    <p>• Works with Gmail (Outlook coming soon)</p>
                                                    <p>• 100% authentic emails (no "via" tags)</p>
                                                    <p>• Best deliverability & reputation</p>
                                                    <p>• One-click setup with OAuth</p>
                                                </div>
                                            </div>
                                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                                <h4 className="text-sm font-semibold text-green-800 mb-2">📧 Email Forwarding (Any Provider)</h4>
                                                <div className="text-xs text-green-700 space-y-1">
                                                    <p>• Works with ANY email provider</p>
                                                    <p>• Yahoo, AOL, custom domains, etc.</p>
                                                    <p>• Simple forwarding rule setup</p>
                                                    <p>• All replies come to your inbox</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
                                            <h4 className="text-sm font-semibold text-slate-700 mb-2">📬 Your Unique Forwarding Address</h4>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="text"
                                                    readOnly
                                                            value={forwardingAddress}
                                                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded text-sm font-mono"
                                                />
                                                <button
                                                    type="button"
                                                            onClick={() => navigator.clipboard?.writeText(forwardingAddress)}
                                                    className="px-3 py-2 bg-slate-600 text-white text-xs rounded hover:bg-slate-700 transition"
                                                >
                                                    Copy
                                                </button>
                                            </div>
                                            <p className="text-xs text-slate-600 mt-2">
                                                Set up a forwarding rule in your email client to forward leads to this address. 
                                                <a href="#" className="text-blue-600 hover:underline ml-1">View setup guide →</a>
                                            </p>
                                        </div>

                                        <div className="space-y-4">
                                            {emailConnections.length > 0 && (
                                                <div className="space-y-2">
                                                    <h4 className="text-sm font-medium text-slate-700">Connected Accounts</h4>
                                                            {emailConnections.map((connection) => (
                                                        <div key={connection.provider} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-lg">
                                                                    {connection.provider === 'gmail' ? '📧' : '📬'}
                                                                </span>
                                                                <div>
                                                                    <p className="font-medium text-green-800">{connection.email}</p>
                                                                    <p className="text-xs text-green-600">Connected {new Date(connection.connectedAt).toLocaleDateString()}</p>
                                                                </div>
                                                            </div>
                                                            <button
                                                                        type="button"
                                                                onClick={() => handleEmailDisconnect(connection.provider)}
                                                                        disabled={isConnecting === connection.provider || isEmailSettingsSaving}
                                                                        className="text-xs px-3 py-1 text-red-600 hover:bg-red-100 rounded flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    >
                                                                        {isConnecting === connection.provider ? (
                                                                            <>
                                                                                <div className="w-3 h-3 border-2 border-red-200 border-t-red-500 rounded-full animate-spin"></div>
                                                                                Removing...
                                                                            </>
                                                                        ) : (
                                                                            'Disconnect'
                                                                        )}
                                                 </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex flex-col sm:flex-row gap-3">
                                                        {!emailConnections.find((c) => c.provider === 'gmail') && (
                                                    <button
                                                        type="button"
                                                        onClick={handleGmailConnect}
                                                                disabled={isConnecting === 'gmail' || isEmailSettingsSaving}
                                                        className="flex-1 flex items-center justify-center gap-3 px-4 py-3 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
                                                    >
                                                        {isConnecting === 'gmail' ? (
                                                            <>
                                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                                <span className="font-semibold">Connecting...</span>
                                                            </>
                                                        ) : (
                                                            <span className="font-semibold">📧 Connect Gmail</span>
                                                        )}
                                                 </button>
                                                )}
                                            </div>

                                            <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded p-3">
                                                <p className="font-medium text-slate-700 mb-1">📬 Other providers</p>
                                                <p>Direct Outlook OAuth is coming soon. Until then, use the forwarding address above so Outlook or any other email service still routes replies back to your inbox.</p>
                                            </div>

                                            {emailConnections.length === 0 && (
                                                <div className="space-y-3">
                                                    <div className="text-xs text-slate-500 bg-blue-50 border border-blue-200 rounded p-3">
                                                        <p className="font-medium text-blue-800 mb-1">🔐 OAuth Connection</p>
                                                        <p>Secure authentication. Your password is never stored or seen by our app.</p>
                                                    </div>
                                                    <div className="text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded p-3">
                                                        <p className="font-medium text-amber-800 mb-1">💡 Don't have Gmail?</p>
                                                        <p>No problem! Use the forwarding address above with any email provider (Outlook, Yahoo, AOL, custom domains, etc.). Just set up email forwarding in your current email client.</p>
                                        </div>
                                    </div>
                                )}
                                        </div>
                                    </div>
                                </div>

                                {/* Email Preferences */}
                                <div className="bg-white rounded-lg border border-slate-200 p-6">
                                    <h3 className="text-lg font-semibold text-slate-800 mb-4">✉️ Email Preferences</h3>
                                    
                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="fromName" className="block text-sm font-medium text-slate-700 mb-1">
                                                Display Name
                                            </label>
                                            <input
                                                type="text"
                                                id="fromName"
                                                name="fromName"
                                                value={emailFormData.fromName || ''}
                                                onChange={(e) => handleEmailSettingsChange('fromName', e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Your Name"
                                            />
                                        </div>

                                                <div>
                                                    <label htmlFor="fromEmail" className="block text-sm font-medium text-slate-700 mb-1">
                                                        From Email
                                                    </label>
                                                    <input
                                                        type="email"
                                                        id="fromEmail"
                                                        name="fromEmail"
                                                        value={emailFormData.fromEmail || ''}
                                                        onChange={(e) => handleEmailSettingsChange('fromEmail', e.target.value)}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        placeholder="you@yourdomain.com"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="signature" className="block text-sm font-medium text-slate-700 mb-1">
                                                Email Signature
                                            </label>
                                            <textarea
                                                id="signature"
                                                name="signature"
                                                value={emailFormData.signature || ''}
                                                onChange={(e) => handleEmailSettingsChange('signature', e.target.value)}
                                                rows={4}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        placeholder="Best regards,\nYour Name\nReal Estate Agent\nPhone: (555) 123-4567"
                                            />
                                        </div>

                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id="autoReply"
                                                name="autoReply"
                                                checked={emailFormData.autoReply || false}
                                                onChange={(e) => handleEmailSettingsChange('autoReply', e.target.checked)}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                                            />
                                            <label htmlFor="autoReply" className="ml-2 block text-sm text-slate-700">
                                                Enable auto-reply for new leads
                                            </label>
                                        </div>

                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id="trackOpens"
                                                name="trackOpens"
                                                checked={emailFormData.trackOpens || false}
                                                onChange={(e) => handleEmailSettingsChange('trackOpens', e.target.checked)}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                                            />
                                            <label htmlFor="trackOpens" className="ml-2 block text-sm text-slate-700">
                                                Track email opens and clicks
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                                disabled={isEmailSettingsSaving}
                                                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isEmailSettingsSaving ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                        Saving…
                                                    </>
                                                ) : (
                                                    'Save Email Settings'
                                                )}
                                    </button>
                                </div>
                                    </>
                                )}
                            </form>
                        )}
                        {activeTab === 'security' && (
                           <div className="p-8">
                                <h2 className="text-2xl font-bold text-slate-900">Security Settings</h2>
                                <p className="text-slate-500 mt-1">Manage your account security and privacy settings</p>

                                {securityError && (
                                    <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
                                        {securityError}
                                    </div>
                                )}

                                {securityMessage && (
                                    <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700" role="status" aria-live="polite">
                                        {securityMessage}
                                    </div>
                                )}

                                {/* Change Password */}
                                <div className="mt-8 pt-8 border-t border-slate-200">
                                    <h3 className="text-lg font-bold text-slate-800">Change Password</h3>
                                    <form onSubmit={handleUpdatePassword} className="mt-4 space-y-4 max-w-md">
                                        <FormInput 
                                            label="Current Password" 
                                            id="currentPassword" 
                                            name="currentPassword"
                                            type="password" 
                                            value={passwords.currentPassword} 
                                            onChange={handlePasswordChange}
                                        />
                                        <FormInput 
                                            label="New Password" 
                                            id="newPassword" 
                                            name="newPassword"
                                            type="password" 
                                            value={passwords.newPassword} 
                                            onChange={handlePasswordChange}
                                        />
                                        <FormInput 
                                            label="Confirm New Password" 
                                            id="confirmNewPassword" 
                                            name="confirmNewPassword"
                                            type="password" 
                                            value={passwords.confirmNewPassword} 
                                            onChange={handlePasswordChange}
                                        />
                                            <div>
                                                <button
                                                    type="submit"
                                                    disabled={isSecuritySaving}
                                                    className="px-5 py-2 font-semibold text-white bg-primary-600 rounded-lg shadow-sm hover:bg-primary-700 transition disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                {isSecuritySaving ? 'Updating…' : 'Update Password'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                           </div>
                        )}
                        
                        {activeTab === 'calendar' && (
                            <form onSubmit={handleCalendarSettingsSave} className="p-8 space-y-8">
                                {calendarSettingsError && (
                                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                        {calendarSettingsError}
                                    </div>
                                )}
                                {calendarSettingsMessage && (
                                    <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                                        {calendarSettingsMessage}
                                    </div>
                                )}
                                <div className="bg-white border border-primary-100 rounded-xl shadow-sm">
                                    <button
                                        type="button"
                                        onClick={() => setShowCalendarTips(prev => !prev)}
                                        className="flex items-center gap-2 w-full px-5 py-3 text-sm font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 transition-colors rounded-t-xl"
                                        aria-expanded={showCalendarTips}
                                    >
                                        <span className="material-symbols-outlined text-xl">{showCalendarTips ? 'psychiatry' : 'tips_and_updates'}</span>
                                        {showCalendarTips ? 'Hide Calendar Tips' : 'Show Calendar Tips'}
                                        <span className="material-symbols-outlined text-base ml-auto">{showCalendarTips ? 'expand_less' : 'expand_more'}</span>
                                    </button>
                                    {showCalendarTips && (
                                        <div className="px-5 pb-5 pt-4 border-t border-primary-100">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-600">
                                                <div className="bg-primary-50 border border-primary-100 rounded-lg p-3">
                                                    <p className="font-semibold text-primary-700 mb-1">Sync first</p>
                                                    <p>Connect Google Calendar before sharing booking links so every consult lands on your real schedule.</p>
                                                </div>
                                                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                                                    <p className="font-semibold text-blue-700 mb-1">Block buffers</p>
                                                    <p>Add a 15–30 minute buffer in your booking rules so back-to-back showings don't crush your day.</p>
                                                </div>
                                                <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                                                    <p className="font-semibold text-green-700 mb-1">Family time locked</p>
                                                    <p>Tick off evenings and weekends you want to keep private — the assistant only books where you say it's OK.</p>
                                                </div>
                                                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                                                    <p className="font-semibold text-amber-700 mb-1">Future-proof</p>
                                                    <p>When Apple or other calendars arrive, you'll just connect once and the AI keeps everything matching.</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">📅 Calendar Integration</h2>
                                    <p className="text-slate-500 mt-1">Connect your Google Calendar to automatically schedule consultations and manage appointments.</p>
                                 </div>

                                <div className="mt-6 bg-white border border-slate-200 rounded-xl">
                                    <div className="p-6">
                                        <div className="mb-4">
                                            <h3 className="text-lg font-semibold text-slate-800">Choose Calendar Service</h3>
                                            <p className="text-sm text-slate-500 mt-1">Tap a card to select your preferred calendar</p>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
                                            <IntegrationCard
                                                icon="calendar_month"
                                                title="Google Calendar"
                                                description="Sync with your Google account for seamless scheduling."
                                                tags={[{ label: 'Popular', color: 'blue' }]}
                                                isSelected={calendarFormData.integrationType === 'google'}
                                                onClick={() => handleCalendarSettingsChange('integrationType', 'google')}
                                            />
                                            <IntegrationCard
                                                icon="calendar_month"
                                                title="Apple Calendar"
                                                description="Integrate with your iCloud Calendar."
                                                tags={[{ label: 'Apple', color: 'green' }]}
                                                isSelected={calendarFormData.integrationType === 'apple'}
                                                onClick={() => handleCalendarSettingsChange('integrationType', 'apple')}
                                            />
                                        </div>
                                    </div>
                                    {calendarFormData.integrationType && (
                                        <div className="border-t border-slate-200 p-6 space-y-4 bg-slate-50">
                                            <div>
                                                <h4 className="font-semibold text-slate-700">How it Works</h4>
                                                <p className="text-sm text-slate-600 mt-1">
                                                    Connecting your calendar allows our AI to check availability, schedule showings, and add appointments directly to your calendar without double-bookings.
                                                </p>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-slate-700">Example Event</h4>
                                                <div className="mt-2 p-3 bg-white border border-slate-200 rounded-md text-sm">
                                                    <p className="font-bold text-primary-700">Showing: 123 Oak St w/ John Doe</p>
                                                    <p className="text-slate-500">Tuesday, August 12, 2:00 PM - 2:30 PM</p>
                                                </div>
                                            </div>
                                            <p className="text-sm text-slate-600">
                                                After selecting {calendarFormData.integrationType === 'google' ? 'Google' : 'your preferred'} calendar, connect your account below to enable automatic scheduling.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Google Calendar Connection */}
                                <FeatureSection title="Google Calendar Connection" icon="calendar_today">
                                    <div className="space-y-6">
                                        {!isGoogleIntegrationAvailable ? (
                                            <div className="bg-slate-100 border border-slate-200 rounded-lg p-6">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-12 h-12 bg-slate-300 rounded-lg flex items-center justify-center flex-shrink-0">
                                                        <span className="material-symbols-outlined text-slate-600 w-6 h-6">info</span>
                                                    </div>
                                                    <div className="flex-1 text-slate-600">
                                                        <h3 className="text-lg font-semibold text-slate-800 mb-2">Integration Unavailable in Demo Mode</h3>
                                                        <p className="text-sm leading-relaxed">
                                                            Google Calendar syncing is disabled for this environment. Add a Google OAuth client ID and secret to enable automatic scheduling, Meet links, and reminders.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                                                    <div className="flex items-start gap-4">
                                                        <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                                            <span className="material-symbols-outlined text-white w-6 h-6">calendar_today</span>
                                                        </div>
                                                        <div className="flex-1">
                                                            <h3 className="text-lg font-semibold text-blue-900 mb-2">Google Calendar Integration</h3>
                                                            <div className="text-sm text-blue-800 space-y-1 mb-4">
                                                                <p>• ✅ Automatic consultation scheduling</p>
                                                                <p>• ✅ Google Meet video links generated</p>
                                                                <p>• ✅ Calendar invites sent to clients</p>
                                                                <p>• ✅ Appointment reminders & notifications</p>
                                                                <p>• ✅ Sync with your existing calendar</p>
                                                            </div>
                                                            
                                                            <div className="flex items-center gap-4">
                                                                <button
                                                                    type="button"
                                                                    onClick={handleGoogleCalendarConnect}
                                                                    disabled={isConnecting === 'google'}
                                                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                                >
                                                                    <span className="material-symbols-outlined w-4 h-4">link</span>
                                                                    {isConnecting === 'google' ? 'Connecting...' : 'Connect Google Calendar'}
                                                                </button>
                                                                
                                                                {isGoogleCalendarConnected && (
                                                                    <div className="flex items-center gap-2 text-green-700">
                                                                        <span className="material-symbols-outlined w-4 h-4">check_circle</span>
                                                                        <span className="text-sm font-medium">Connected</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {isGoogleCalendarConnected && (
                                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                                        <div className="flex items-center gap-3">
                                                            <span className="material-symbols-outlined w-5 h-5 text-green-600">check_circle</span>
                                                            <div>
                                                                <h4 className="font-medium text-green-900">Calendar Connected Successfully!</h4>
                                                                <p className="text-sm text-green-700 mt-1">
                                                                    Consultations booked through your website will automatically appear in your Google Calendar with Meet links.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </FeatureSection>

                                {/* Calendar Preferences */}
                                <FeatureSection title="Booking Preferences" icon="tune">
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-3" htmlFor="calendar-start-time">Available Hours</label>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs text-slate-500 mb-1" htmlFor="calendar-start-time">Start Time</label>
                                                    <input
                                                        type="time"
                                                        name="startTime"
                                                        id="calendar-start-time"
                                                        value={calendarFormData.workingHours?.start || '09:00'}
                                                        onChange={handleCalendarInputChange}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-slate-500 mb-1" htmlFor="calendar-end-time">End Time</label>
                                                    <input
                                                        type="time"
                                                        name="endTime"
                                                        id="calendar-end-time"
                                                        value={calendarFormData.workingHours?.end || '17:00'}
                                                        onChange={handleCalendarInputChange}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-2">Clients can only book consultations during these hours</p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-3">Working Days</label>
                                            <div className="grid grid-cols-4 gap-2">
                                                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                                                    <label key={day} className="flex items-center space-x-2 p-2 border border-slate-200 rounded cursor-pointer hover:bg-slate-50">
                                                        <input
                                                            type="checkbox"
                                                            checked={calendarFormData.workingDays?.includes(day.toLowerCase()) || false}
                                                            onChange={(e) => handleWorkingDayToggle(day.toLowerCase(), e.target.checked)}
                                                            className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                                        />
                                                        <span className="text-sm text-slate-700">{day.slice(0, 3)}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-3" htmlFor="calendar-default-duration">Consultation Duration</label>
                                            <select
                                                name="defaultDuration"
                                                id="calendar-default-duration"
                                                value={calendarFormData.defaultDuration || 30}
                                                onChange={handleCalendarInputChange}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                            >
                                                <option value={15}>15 minutes</option>
                                                <option value={30}>30 minutes</option>
                                                <option value={45}>45 minutes</option>
                                                <option value={60}>1 hour</option>
                                                <option value={90}>1.5 hours</option>
                                            </select>
                                            <p className="text-xs text-slate-500 mt-2">Default length for new consultations</p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-3" htmlFor="calendar-buffer-time">Buffer Time</label>
                                            <select
                                                name="bufferTime"
                                                id="calendar-buffer-time"
                                                value={calendarFormData.bufferTime || 15}
                                                onChange={handleCalendarInputChange}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                            >
                                                <option value={0}>No buffer</option>
                                                <option value={5}>5 minutes</option>
                                                <option value={10}>10 minutes</option>
                                                <option value={15}>15 minutes</option>
                                                <option value={30}>30 minutes</option>
                                            </select>
                                            <p className="text-xs text-slate-500 mt-2">Time between appointments for travel/preparation</p>
                                        </div>
                                    </div>
                                </FeatureSection>

                                {/* Notifications */}
                                <FeatureSection title="Calendar Notifications" icon="notifications">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                            <div>
                                                <h4 className="font-medium text-slate-900">Email Reminders</h4>
                                                <p className="text-sm text-slate-500">Send automatic email reminders to clients</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={calendarFormData.emailReminders !== false}
                                                    onChange={(e) => handleCalendarToggle('emailReminders', e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                            </label>
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-medium text-slate-900">SMS Reminders</h4>
                                                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-700 rounded-full">Coming Soon</span>
                                                </div>
                                                <p className="text-sm text-slate-500">Send SMS reminders (requires phone number & SMS provider setup)</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={calendarFormData.smsReminders || false}
                                                    onChange={(e) => handleCalendarToggle('smsReminders', e.target.checked)}
                                                    className="sr-only peer"
                                                    disabled
                                                />
                                                <div className="w-11 h-6 bg-gray-200 opacity-60 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                                            </label>
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                            <div>
                                                <h4 className="font-medium text-slate-900">New Appointment Alerts</h4>
                                                <p className="text-sm text-slate-500">Get notified when someone books a consultation</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={calendarFormData.newAppointmentAlerts !== false}
                                                    onChange={(e) => handleCalendarToggle('newAppointmentAlerts', e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                            </label>
                                        </div>
                                    </div>
                                </FeatureSection>

                                <div className="flex items-center justify-between pt-8 border-t border-slate-200">
                                    <button
                                        type="button"
                                        onClick={_onBackToDashboard}
                                        className="px-6 py-2 text-slate-600 hover:text-slate-800 transition-colors"
                                    >
                                        ← Back to Dashboard
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isCalendarSettingsSaving || isCalendarSettingsLoading}
                                        className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {isCalendarSettingsSaving ? 'Saving…' : 'Save Calendar Settings'}
                                    </button>
                                </div>
                            </form>
                        )}
                        
                        {activeTab === 'security' && (
                            <form onSubmit={handlePasswordSave} className="p-8 space-y-8">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">🔐 Security Settings</h2>
                                    <p className="text-slate-500 mt-1">Manage your account security, passwords, and privacy settings.</p>
                                </div>

                                {/* Password Change */}
                                <FeatureSection title="Change Password" icon="lock">
                                    <div className="space-y-6">
                                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                            <div className="flex items-start gap-3">
                                                <span className="material-symbols-outlined w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5">info</span>
                                                <div>
                                                    <h4 className="font-medium text-amber-900">Password Security</h4>
                                                    <p className="text-sm text-amber-800 mt-1">
                                                        Use a strong password with at least 8 characters, including letters, numbers, and symbols.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Current Password</label>
                                                <input
                                                    type="password"
                                                    name="currentPassword"
                                                    value={passwords.currentPassword}
                                                    onChange={handlePasswordChange}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                                    placeholder="Enter current password"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">New Password</label>
                                                <input
                                                    type="password"
                                                    name="newPassword"
                                                    value={passwords.newPassword}
                                                    onChange={handlePasswordChange}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                                    placeholder="Enter new password"
                                                />
                                                <div className="mt-2">
                                                    <div className="text-xs text-slate-500 space-y-1">
                                                        <div className={`flex items-center gap-2 ${passwords.newPassword.length >= 8 ? 'text-green-600' : ''}`}>
                                                            <span className={`w-2 h-2 rounded-full ${passwords.newPassword.length >= 8 ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                                                            At least 8 characters
                                                        </div>
                                                        <div className={`flex items-center gap-2 ${/[A-Z]/.test(passwords.newPassword) ? 'text-green-600' : ''}`}>
                                                            <span className={`w-2 h-2 rounded-full ${/[A-Z]/.test(passwords.newPassword) ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                                                            One uppercase letter
                                                        </div>
                                                        <div className={`flex items-center gap-2 ${/[0-9]/.test(passwords.newPassword) ? 'text-green-600' : ''}`}>
                                                            <span className={`w-2 h-2 rounded-full ${/[0-9]/.test(passwords.newPassword) ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                                                            One number
                                                        </div>
                                                        <div className={`flex items-center gap-2 ${/[^A-Za-z0-9]/.test(passwords.newPassword) ? 'text-green-600' : ''}`}>
                                                            <span className={`w-2 h-2 rounded-full ${/[^A-Za-z0-9]/.test(passwords.newPassword) ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                                                            One special character
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Confirm New Password</label>
                                                <input
                                                    type="password"
                                                    name="confirmNewPassword"
                                                    value={passwords.confirmNewPassword}
                                                    onChange={handlePasswordChange}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                                    placeholder="Confirm new password"
                                                />
                                                {passwords.confirmNewPassword && passwords.newPassword !== passwords.confirmNewPassword && (
                                                    <p className="text-sm text-red-600 mt-1">Passwords do not match</p>
                                                )}
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={!isPasswordValid}
                                            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Update Password
                                        </button>
                                    </div>
                                </FeatureSection>

                                {/* Security Features */}
                                <FeatureSection title="Account Security" icon="security">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                            <div>
                                                <h4 className="font-medium text-slate-900">Two-Factor Authentication</h4>
                                                <p className="text-sm text-slate-500">Add an extra layer of security to your account</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={false}
                                                    disabled
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-disabled:opacity-50">
                                                    <div className="w-5 h-5 bg-white border border-gray-300 rounded-full mt-0.5 ml-0.5"></div>
                                                </div>
                                            </label>
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                            <div>
                                                <h4 className="font-medium text-slate-900">Login Notifications</h4>
                                                <p className="text-sm text-slate-500">Get notified when someone logs into your account</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={securitySettings.loginNotifications !== false}
                                                    onChange={(e) => handleSecurityToggle('loginNotifications', e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                            </label>
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                            <div>
                                                <h4 className="font-medium text-slate-900">Session Timeout</h4>
                                                <p className="text-sm text-slate-500">Automatically log out after inactivity</p>
                                            </div>
                                            <select
                                                value={securitySettings.sessionTimeout || 24}
                                                onChange={(e) => handleSecurityToggle('sessionTimeout', parseInt(e.target.value))}
                                                className="px-3 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                            >
                                                <option value={1}>1 hour</option>
                                                <option value={4}>4 hours</option>
                                                <option value={8}>8 hours</option>
                                                <option value={24}>24 hours</option>
                                                <option value={0}>Never</option>
                                            </select>
                                        </div>
                                    </div>
                                </FeatureSection>

                                {/* Privacy Settings */}
                                <FeatureSection title="Privacy & Data" icon="privacy_tip">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                            <div>
                                                <h4 className="font-medium text-slate-900">Analytics & Usage Data</h4>
                                                <p className="text-sm text-slate-500">Help improve the app by sharing anonymous usage data</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={securitySettings.analyticsEnabled !== false}
                                                    onChange={(e) => handleSecurityToggle('analyticsEnabled', e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                            </label>
                                        </div>

                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                            <div className="flex items-start gap-3">
                                                <span className="material-symbols-outlined w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5">shield</span>
                                                <div>
                                                    <h4 className="font-medium text-blue-900">Your Data is Secure</h4>
                                                    <p className="text-sm text-blue-700 mt-1">
                                                        All your data is encrypted and stored securely. We never share your personal information with third parties.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </FeatureSection>

                                <div className="flex items-center justify-between pt-8 border-t border-slate-200">
                                    <button
                                        type="button"
                                        onClick={_onBackToDashboard}
                                        className="px-6 py-2 text-slate-600 hover:text-slate-800 transition-colors"
                                    >
                                        ← Back to Dashboard
                                    </button>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={handleSecuritySettingsSave}
                                            className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                                        >
                                            Save Security Settings
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}


                        {activeTab === 'billing' && (
                            <div className="p-8 space-y-8">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">💳 Billing & Subscription</h2>
                                    <p className="text-slate-500 mt-1">Manage your subscription, billing information, and payment methods.</p>
                                </div>
                                {billingError && (
                                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
                                        {billingError}
                                    </div>
                                )}
                                {billingMessage && (
                                    <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700" role="status" aria-live="polite">
                                        {billingMessage}
                                    </div>
                                )}
                                <div className="bg-white border border-primary-100 rounded-xl shadow-sm">
                                    <button
                                        type="button"
                                        onClick={() => setShowBillingTips(prev => !prev)}
                                        className="flex items-center gap-2 w-full px-5 py-3 text-sm font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 transition-colors rounded-t-xl"
                                        aria-expanded={showBillingTips}
                                    >
                                        <span className="material-symbols-outlined text-xl">{showBillingTips ? 'psychiatry' : 'tips_and_updates'}</span>
                                        {showBillingTips ? 'Hide Billing Tips' : 'Show Billing Tips'}
                                        <span className="material-symbols-outlined text-base ml-auto">{showBillingTips ? 'expand_less' : 'expand_more'}</span>
                                    </button>
                                    {showBillingTips && (
                                        <div className="px-5 pb-5 pt-4 border-t border-primary-100">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-600">
                                                <div className="bg-primary-50 border border-primary-100 rounded-lg p-3">
                                                    <p className="font-semibold text-primary-700 mb-1">Download invoices</p>
                                                    <p>Use Billing History to grab receipts for bookkeeping—each line has a quick download link.</p>
                                                </div>
                                                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                                                    <p className="font-semibold text-blue-700 mb-1">Need to pause?</p>
                                                    <p>Use the cancel plan link below to schedule a downgrade at the end of the billing period.</p>
                                                </div>
                                                <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                                                    <p className="font-semibold text-green-700 mb-1">Upgrade anytime</p>
                                                    <p>Reach out to our team for custom plans if you need more AI power than the standard package.</p>
                                                </div>
                                                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                                                    <p className="font-semibold text-amber-700 mb-1">Keep forwarding active</p>
                                                    <p>Even after canceling, remember to disable email forwarding rules so leads stop routing to the AI.</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Current Plan - Matching Landing Page */}
                                 <FeatureSection title="Current Plan" icon="star">
                                    <div className="bg-gradient-to-tr from-primary-700 to-primary-500 text-white rounded-2xl p-8 shadow-2xl">
                                        <div className="flex items-center justify-between mb-6">
                                            <div>
                                                <h3 className="text-2xl font-bold text-white">Complete AI Solution</h3>
                                                <p className="text-slate-300">Everything you need to dominate your market and close more deals</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-3xl font-bold">$139<span className="text-lg font-medium">/mo</span></div>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined w-4 h-4 text-green-400">check_circle</span>
                                                <span>Unlimited AI interactions per month</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined w-4 h-4 text-green-400">check_circle</span>
                                                <span>1GB of storage space</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined w-4 h-4 text-green-400">check_circle</span>
                                                <span>500 emails per month</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined w-4 h-4 text-green-400">check_circle</span>
                                                <span>Advanced analytics dashboard</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined w-4 h-4 text-green-400">check_circle</span>
                                                <span>Your own trained GPT</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined w-4 h-4 text-green-400">check_circle</span>
                                                <span>Automated follow-up sequences</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined w-4 h-4 text-green-400">check_circle</span>
                                                <span>Auto leads to closing</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined w-4 h-4 text-green-400">check_circle</span>
                                                <span>Need more? We do custom programs</span>
                                            </div>
                                        </div>
                                        <div className="mt-6 flex flex-wrap gap-3">
                                            <button
                                                type="button"
                                                onClick={handlePayPalCheckout}
                                                disabled={!paypalAvailable || isBillingCheckoutLoading}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-white/40 bg-white/15 text-white font-semibold shadow transition-colors ${(!paypalAvailable || isBillingCheckoutLoading) ? 'opacity-60 cursor-not-allowed' : 'hover:bg-white/25'}`}
                                            >
                                                <span className="material-symbols-outlined text-base">account_balance</span>
                                                {isBillingCheckoutLoading ? 'Launching checkout...' : paypalAvailable ? 'Manage via PayPal' : 'PayPal unavailable'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleCancelMembership}
                                                className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg border border-white/20 hover:bg-white/20 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-base">cancel</span>
                                                Cancel Plan
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleContactSupport}
                                                className="flex items-center gap-2 px-4 py-2 bg-white text-primary-600 rounded-lg hover:bg-slate-100 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-base">support_agent</span>
                                                Talk to Support
                                            </button>
                                        </div>
                                        {!paypalAvailable && (
                                            <p className="mt-3 text-xs text-white/80">
                                                PayPal checkout isn&apos;t available yet. Add your PayPal credentials to enable in-app billing.
                                            </p>
                                        )}
                                    </div>
                                </FeatureSection>


                                {/* Billing History */}
                                <FeatureSection title="Billing History" icon="receipt">
                                    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-slate-50">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Description</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Invoice</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200">
                                                    <tr>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">Dec 15, 2024</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">Complete AI Solution - Monthly</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">$139.00</td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">Paid</span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                            <button className="text-primary-600 hover:text-primary-700">Download</button>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">Nov 15, 2024</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">Complete AI Solution - Monthly</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">$139.00</td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">Paid</span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                            <button className="text-primary-600 hover:text-primary-700">Download</button>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">Oct 15, 2024</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">Complete AI Solution - Monthly</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">$139.00</td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">Paid</span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                            <button className="text-primary-600 hover:text-primary-700">Download</button>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </FeatureSection>

                                <div className="flex items-center justify-between pt-8 border-t border-slate-200">
                                    <button
                                        type="button"
                                        onClick={_onBackToDashboard}
                                        className="px-6 py-2 text-slate-600 hover:text-slate-800 transition-colors"
                                    >
                                        ← Back to Dashboard
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab !== 'notifications' &&
                            activeTab !== 'email' &&
                            activeTab !== 'calendar' &&
                            activeTab !== 'security' &&
                            activeTab !== 'billing' && (
                                <div className="text-center py-20 p-8">
                                    <h2 className="text-xl font-semibold text-slate-700">Coming Soon</h2>
                                    <p className="text-slate-500 mt-2">This settings page is under construction.</p>
                                </div>
                            )}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;

