import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AgentProfile, NotificationSettings, EmailSettings, CalendarSettings, BillingSettings } from '../types';
import { googleOAuthService } from '../services/googleOAuthService';
import { calendarSettingsService } from '../services/calendarSettingsService';
import { billingSettingsService } from '../services/billingSettingsService';
import { supabase } from '../services/supabase';
import { agentOnboardingService } from '../services/agentOnboardingService';
import { useApiErrorNotifier } from '../hooks/useApiErrorNotifier';
import { useAgentBranding } from '../hooks/useAgentBranding';

import { getBooleanEnv, getEnvVar } from '../lib/env';

type EmailConnection = {
    provider: 'gmail' | 'outlook';
    email: string;
    connectedAt: string;
    status: 'active' | 'expired' | 'error';
};

type SecuritySettingsState = {
    loginNotifications: boolean;
    sessionTimeout: number;
    analyticsEnabled: boolean;
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
    onNavigateToAICard?: () => void;
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
            className={`flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${isActive
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
            className={`relative inline-flex flex-shrink-0 items-center h-6 rounded-full w-11 cursor-pointer transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${disabled
                ? 'bg-slate-200 cursor-not-allowed opacity-60'
                : enabled
                    ? 'bg-primary-600'
                    : 'bg-slate-300'
                }`}
        >
            <span
                aria-hidden='true'
                className={`inline-block w-4 h-4 transform bg-white rounded-full shadow-lg ring-0 transition-transform duration-200 ease-in-out ${enabled ? 'translate-x-6' : 'translate-x-1'
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
            className={`p-4 sm:p-5 text-left rounded-xl border-2 transition-all w-full h-full flex flex-col min-h-[140px] sm:min-h-[160px] ${isSelected
                ? 'border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-200'
                : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md hover:bg-slate-50 active:bg-slate-100'
                }`}
        >
            <div className="flex items-center gap-3 sm:gap-4 mb-3">
                <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center ${isSelected ? 'bg-blue-500' : 'bg-slate-100'
                    }`}>
                    <span className={`material-symbols-outlined w-5 h-5 sm:w-6 sm:h-6 ${isSelected ? 'text-white' : 'text-slate-600'
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

const SettingsPage: React.FC<SettingsPageProps> = ({ userId, userProfile, onSaveProfile: _onSaveProfile, notificationSettings, onSaveNotifications: _onSaveNotifications, emailSettings, onSaveEmailSettings: _onSaveEmailSettings, calendarSettings, onSaveCalendarSettings: _onSaveCalendarSettings, billingSettings: _billingSettings, onSaveBillingSettings: _onSaveBillingSettings, onBackToDashboard: _onBackToDashboard, onNavigateToAICard }) => {
    const notifyApiError = useApiErrorNotifier();
    const { uiProfile, refresh: refreshBranding, aiCardProfile } = useAgentBranding();
    const agentProfile = userProfile ?? uiProfile;


    const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'email' | 'calendar' | 'security' | 'billing'>('profile');
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
    const googleIntegrationEnabled = useMemo(() => getBooleanEnv('VITE_ENABLE_GOOGLE_INTEGRATIONS'), []);
    const googleIntegrationClientPresent = useMemo(() => {
        const clientId = getEnvVar('GOOGLE_OAUTH_CLIENT_ID');
        return typeof clientId === 'string' && clientId.trim().length > 0;
    }, []);
    const initialGoogleIntegrationAvailable =
        googleOAuthService.isAvailable || googleIntegrationEnabled || googleIntegrationClientPresent;
    const [isGoogleIntegrationAvailable, setIsGoogleIntegrationAvailable] = useState(initialGoogleIntegrationAvailable);
    const [planBadge, setPlanBadge] = useState<{ plan?: string; status?: string } | null>(null);
    const [billingData, setBillingData] = useState<BillingSettings>(_billingSettings);
    const [isBillingSettingsLoading, setIsBillingSettingsLoading] = useState<boolean>(false);
    const billingDefaultsRef = useRef<BillingSettings>(_billingSettings);
    const notificationDefaultsRef = useRef<NotificationSettings>(notificationSettings);
    const paypalPortalUrl = (() => {
        const metaEnv = (globalThis as Record<string, unknown> & { __VITE_ENV__?: Record<string, unknown> }).__VITE_ENV__;
        const nodeEnv = typeof process !== 'undefined' ? process.env : undefined;
        const value = metaEnv?.VITE_PAYPAL_PORTAL_URL ?? nodeEnv?.VITE_PAYPAL_PORTAL_URL ?? nodeEnv?.PAYPAL_PORTAL_URL;
        return typeof value === 'string' && value.trim() ? value.trim() : undefined;
    })();

    // Read tab query from hash: #/settings?tab=billing
    useEffect(() => {
        const handle = () => {
            const hash = window.location.hash || '';
            const qIndex = hash.indexOf('?');
            if (qIndex >= 0) {
                const qs = new URLSearchParams(hash.substring(qIndex + 1));
                const tab = (qs.get('tab') || '').toLowerCase();
                if (tab === 'billing') setActiveTab('billing');
                if (tab === 'profile') setActiveTab('profile');
                if (tab === 'email') setActiveTab('email');
                if (tab === 'calendar') setActiveTab('calendar');
                if (tab === 'security') setActiveTab('security');
                if (tab === 'notifications') setActiveTab('notifications');
            }
        };
        handle();
        window.addEventListener('hashchange', handle);
        return () => window.removeEventListener('hashchange', handle);
    }, []);



    const extractPlanInfo = useCallback((profile: typeof aiCardProfile) => {
        if (!profile) return null;
        const planValue = 'plan' in profile ? (profile as { plan?: unknown }).plan : undefined;
        const statusValue =
            'subscription_status' in profile
                ? (profile as { subscription_status?: unknown }).subscription_status
                : undefined;
        const plan = typeof planValue === 'string' ? planValue : undefined;
        const subscriptionStatus = typeof statusValue === 'string' ? statusValue : undefined;
        if (plan || subscriptionStatus) {
            return { plan, status: subscriptionStatus };
        }
        return null;
    }, []);

    // Load plan/subscription status for billing badge
    useEffect(() => {
        if (activeTab !== 'billing') return;

        const info = extractPlanInfo(aiCardProfile);
        if (info || aiCardProfile) {
            setPlanBadge(info);
            if (info) return;
        }

        const loadPlan = async () => {
            try {
                await refreshBranding();
            } catch (error) {
                notifyApiError({
                    title: 'Could not load billing status',
                    description: 'Please refresh the page or contact support if billing info still will not load.',
                    error
                });
            }
        };

        void loadPlan();
    }, [activeTab, aiCardProfile, extractPlanInfo, refreshBranding, notifyApiError]);



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
    const emailDefaultsRef = useRef<EmailSettings>(emailSettings);
    const emailConnectionsRef = useRef<EmailConnection[]>([]);
    const forwardingAddress = useMemo(() => {
        const baseEmail = emailFormData.fromEmail || agentProfile.email || 'agent@homelistingai.com';
        const localPart = (baseEmail.split('@')[0] || 'agent').toLowerCase();
        const safeLocalPart = localPart.replace(/[^a-z0-9]/g, '') || 'agent';
        return `agent-${safeLocalPart}@homelistingai.com`;
    }, [emailFormData.fromEmail, agentProfile.email]);
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
            const nextSettings = settings ?? emailDefaultsRef.current;
            const nextConnections = connections ?? emailConnectionsRef.current;

            emailDefaultsRef.current = nextSettings;
            emailConnectionsRef.current = nextConnections;

            setEmailFormData(nextSettings);
            setEmailConnections(nextConnections);
            _onSaveEmailSettings(nextSettings);
        },
        [_onSaveEmailSettings]
    );

    const fetchEmailSettings = useCallback(async () => {
        if (!userId) {
            return {
                settings: emailDefaultsRef.current,
                connections: emailConnectionsRef.current
            };
        }

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
                const nextSettings = (data?.settings as EmailSettings) || emailDefaultsRef.current;
                const nextConnections = (data?.connections as EmailConnection[]) || emailConnectionsRef.current;
                applyEmailSettings(nextSettings, nextConnections);

                if (showMessage) {
                    setEmailSaveMessage('Email settings updated.');
                }
            } catch (error) {
                notifyApiError({
                    title: 'Could not load email settings',
                    description: 'Please refresh the page or try again in a few moments.',
                    error
                });
                setEmailSettingsError(
                    error instanceof Error
                        ? error.message
                        : 'Unable to load email settings. Please try again.'
                );
                if (showLoading) {
                    setEmailFormData(emailDefaultsRef.current);
                    setEmailConnections(emailConnectionsRef.current);
                }
            } finally {
                if (showLoading) {
                    setIsEmailSettingsLoading(false);
                }
            }
        },
        [applyEmailSettings, fetchEmailSettings, notifyApiError]
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
                notifyApiError({
                    title: 'Could not load calendar settings',
                    description: 'We are using your last saved defaults. Please try again later.',
                    error
                });
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
        [_onSaveCalendarSettings, userId, notifyApiError]
    );

    // Calendar connection state
    const [isGoogleCalendarConnected, setIsGoogleCalendarConnected] = useState(false);

    // Security settings state
    const [securitySettings, setSecuritySettings] = useState<SecuritySettingsState>({
        loginNotifications: true,
        sessionTimeout: 24,
        analyticsEnabled: true
    });
    const [isSecuritySettingsLoading, setIsSecuritySettingsLoading] = useState<boolean>(false);
    const securityDefaultsRef = useRef<SecuritySettingsState>({
        loginNotifications: true,
        sessionTimeout: 24,
        analyticsEnabled: true
    });

    useEffect(() => {
        let isActive = true;

        const loadPreferences = async () => {
            if (!userId) {
                setIsNotificationsLoading(false);
                return;
            }

            setIsNotificationsLoading(true);
            setNotificationSaveError(null);

            try {
                const response = await fetch(`/api/notifications/preferences/${encodeURIComponent(userId)}`);
                if (!response.ok) {
                    throw new Error(`Request failed with status ${response.status}`);
                }

                const data = await response.json();
                if (!isActive) return;

                const preferences =
                    (data?.preferences as NotificationSettings | undefined) ?? notificationDefaultsRef.current;

                setCurrentNotifications(preferences);
                notificationDefaultsRef.current = preferences;
                _onSaveNotifications(preferences);
            } catch (error) {
                notifyApiError({
                    title: 'Could not load notification preferences',
                    description: 'Using your last saved options. Refresh to try again.',
                    error
                });
                if (isActive) {
                    setNotificationSaveError('Unable to load notification preferences. Using defaults for now.');
                    setCurrentNotifications(notificationDefaultsRef.current);
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
    }, [userId, _onSaveNotifications, notifyApiError]);


    useEffect(() => {
        notificationDefaultsRef.current = notificationSettings;
        setCurrentNotifications(notificationSettings);
    }, [notificationSettings]);

    useEffect(() => {
        const available =
            googleOAuthService.isAvailable ||
            googleIntegrationEnabled ||
            googleIntegrationClientPresent;

        if (!googleOAuthService.isAvailable && available) {
            (googleOAuthService as unknown as { isAvailable: boolean }).isAvailable = true;
        }

        setIsGoogleIntegrationAvailable(available);
        setIsGoogleCalendarConnected(googleOAuthService.isAuthenticated('calendar'));
    }, [googleIntegrationClientPresent, googleIntegrationEnabled]);

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

                const nextSettings = (data?.settings as EmailSettings) || emailDefaultsRef.current;
                const nextConnections = (data?.connections as EmailConnection[]) || emailConnectionsRef.current;
                applyEmailSettings(nextSettings, nextConnections);
            } catch (error) {
                notifyApiError({
                    title: 'Could not load email settings',
                    description: 'We are using your last saved email preferences. Refresh to try again.',
                    error
                });
                if (!cancelled) {
                    setEmailSettingsError('Unable to load email settings. Using defaults for now.');
                    setEmailFormData(emailDefaultsRef.current);
                    setEmailConnections(emailConnectionsRef.current);
                }
            } finally {
                if (!cancelled) {
                    setIsEmailSettingsLoading(false);
                }
            }
        };

        if (!userId) {
            setIsEmailSettingsLoading(false);
            return;
        }

        void load();

        return () => {
            cancelled = true;
        };
    }, [applyEmailSettings, fetchEmailSettings, notifyApiError, userId]);

    useEffect(() => {
        emailDefaultsRef.current = emailSettings;
        setEmailFormData(emailSettings);
    }, [emailSettings]);

    // Email connection handlers
    const handleGmailConnect = async () => {
        if (!isGoogleIntegrationAvailable) {
            const message = 'Google OAuth is not configured for this environment. Add your Google client ID, secret, and redirect URI to enable direct Gmail connections.';
            setEmailSettingsError(message);
            notifyApiError({
                title: 'Google OAuth unavailable',
                description: 'Set GOOGLE_OAUTH_CLIENT_ID / SECRET / REDIRECT_URI (and VITE equivalents) then restart the server to enable Gmail OAuth.',
                error: new Error(message)
            });
            return;
        }

        setIsConnecting('gmail');
        setEmailSettingsError(null);
        setEmailSaveMessage(null);

        try {
            const response = await fetch(`/api/email/google/oauth-url?userId=${encodeURIComponent(userId)}`);

            if (response.status === 503) {
                const payload = await response.json().catch(() => ({}));
                const message =
                    typeof payload?.error === 'string' && payload.error.length
                        ? payload.error
                        : 'Google OAuth is not configured.';
                throw new Error(message);
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
            const description =
                error instanceof Error && /not configured/i.test(error.message)
                    ? 'Add Google OAuth credentials (.env: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI and VITE_ENABLE_GOOGLE_INTEGRATIONS=true) then restart the dev server.'
                    : 'Please allow pop-ups and try connecting Gmail again.';

            notifyApiError({
                title: 'Google OAuth could not start',
                description,
                error
            });
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
            notifyApiError({
                title: 'Could not disconnect email account',
                description: 'Please try again. Your connection is still active.',
                error
            });
            setEmailSettingsError('Failed to disconnect email provider. Please try again.');
        } finally {
            setIsConnecting(null);
        }
    };

    // Calendar connection handlers
    const handleGoogleCalendarConnect = async () => {
        setIsConnecting('google');
        try {
            if (!isGoogleIntegrationAvailable) {
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
            notifyApiError({
                title: 'Google Calendar connection failed',
                description: 'We could not finish the connection. Please try again shortly.',
                error
            });
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
            notifyApiError({
                title: 'Could not save calendar settings',
                description: 'Please review your changes and try again.',
                error
            });
            setCalendarSettingsError('Failed to save calendar settings. Please try again.');
        } finally {
            setIsCalendarSettingsSaving(false);
        }
    };

    const loadBillingSettings = useCallback(
        async ({ showLoading = false }: { showLoading?: boolean } = {}) => {
            if (showLoading && isMountedRef.current) {
                setIsBillingSettingsLoading(true);
            }

            if (!userId) {
                if (isMountedRef.current) {
                    setIsBillingSettingsLoading(false);
                }
                return billingDefaultsRef.current;
            }

            try {
                const settings = await billingSettingsService.get(userId);
                const next = settings ?? billingDefaultsRef.current;

                billingDefaultsRef.current = next;

                if (isMountedRef.current) {
                    setBillingData(next);
                    setBillingMessage(null);
                    setBillingError(null);
                    setPlanBadge(prev => ({
                        plan: next.planName || prev?.plan,
                        status: next.planStatus || prev?.status
                    }));
                    _onSaveBillingSettings(next);
                }

                return next;
            } catch (error) {
                notifyApiError({
                    title: 'Could not load billing settings',
                    description: 'Using your last saved billing history for now.',
                    error
                });

                if (isMountedRef.current) {
                    setBillingError('Unable to load billing settings. Showing your last saved details.');
                    setBillingData(billingDefaultsRef.current);
                }

                return billingDefaultsRef.current;
            } finally {
                if (isMountedRef.current) {
                    setIsBillingSettingsLoading(false);
                }
            }
        },
        [userId, notifyApiError, _onSaveBillingSettings]
    );

    useEffect(() => {
        billingDefaultsRef.current = _billingSettings;
        setBillingData(_billingSettings);
    }, [_billingSettings]);

    useEffect(() => {
        void loadBillingSettings({ showLoading: true });
    }, [loadBillingSettings]);

    const loadSecuritySettings = useCallback(
        async ({ showLoading = false }: { showLoading?: boolean } = {}) => {
            if (showLoading) {
                setIsSecuritySettingsLoading(true);
            }

            if (!userId) {
                if (showLoading) {
                    setIsSecuritySettingsLoading(false);
                }
                return securityDefaultsRef.current;
            }

            setSecurityError(null);

            try {
                const response = await fetch(`/api/security/settings/${encodeURIComponent(userId)}`);
                if (!response.ok) {
                    throw new Error(`Request failed with status ${response.status}`);
                }

                const data = await response.json();
                const incoming =
                    (data?.settings as SecuritySettingsState | undefined) ?? securityDefaultsRef.current;

                const merged: SecuritySettingsState = {
                    ...securityDefaultsRef.current,
                    ...incoming
                };

                securityDefaultsRef.current = merged;

                if (isMountedRef.current) {
                    setSecuritySettings(merged);
                }

                return merged;
            } catch (error) {
                notifyApiError({
                    title: 'Could not load security settings',
                    description: 'Using your last saved security preferences.',
                    error
                });

                if (isMountedRef.current) {
                    setSecurityError('Unable to load security preferences. Using your last saved options.');
                    setSecuritySettings(securityDefaultsRef.current);
                }

                return securityDefaultsRef.current;
            } finally {
                if (isMountedRef.current) {
                    setIsSecuritySettingsLoading(false);
                }
            }
        },
        [userId, notifyApiError]
    );

    useEffect(() => {
        securityDefaultsRef.current = securitySettings;
    }, [securitySettings]);

    useEffect(() => {
        void loadSecuritySettings({ showLoading: true });
    }, [loadSecuritySettings]);

    // Security handlers
    const handlePasswordSave = async (e: React.FormEvent) => {
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

        if (!/[A-Z]/.test(next) || !/[0-9]/.test(next) || !/[^A-Za-z0-9]/.test(next)) {
            setSecurityError('Password must include an uppercase letter, a number, and a symbol.');
            return;
        }

        setIsSecuritySaving(true);

        try {
            const { data: { user }, error: sessionError } = await supabase.auth.getUser();
            if (sessionError || !user?.email) {
                throw new Error('Unable to verify your session. Please sign in again.');
            }

            const email = user.email || agentProfile.email;
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
            setPasswords({
                currentPassword: '',
                newPassword: '',
                confirmNewPassword: ''
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update password. Please try again.';
            setSecurityError(message);
        } finally {
            setIsSecuritySaving(false);
        }
    };

    const handleSecurityToggle = (setting: keyof SecuritySettingsState, value: boolean | number) => {
        setSecurityMessage(null);
        setSecurityError(null);
        setSecuritySettings(prev => {
            if (setting === 'sessionTimeout') {
                const numeric = typeof value === 'number' ? value : parseInt(String(value), 10);
                if (Number.isNaN(numeric)) {
                    return prev;
                }

                return {
                    ...prev,
                    sessionTimeout: numeric
                };
            }

            return {
                ...prev,
                [setting]: Boolean(value)
            };
        });
    };

    const handleSecuritySettingsSave = async () => {
        if (!userId || isSecuritySaving || isSecuritySettingsLoading) {
            return;
        }

        setSecurityError(null);
        setSecurityMessage(null);
        setIsSecuritySaving(true);

        try {
            const response = await fetch(`/api/security/settings/${encodeURIComponent(userId)}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(securitySettings)
            });

            if (!response.ok) {
                throw new Error(`Request failed with status ${response.status}`);
            }

            const data = await response.json();
            const incoming =
                (data?.settings as SecuritySettingsState | undefined) ?? securitySettings;

            const merged: SecuritySettingsState = {
                ...securityDefaultsRef.current,
                ...incoming
            };

            securityDefaultsRef.current = merged;
            setSecuritySettings(merged);
            setSecurityMessage('Security settings saved successfully.');
        } catch (error) {
            notifyApiError({
                title: 'Could not save security settings',
                description: 'Please try again in a few moments.',
                error
            });
            setSecurityError('Unable to save security settings. Using your last saved preferences.');
            setSecuritySettings(securityDefaultsRef.current);
        } finally {
            setIsSecuritySaving(false);
        }
    };

    // Password validation
    const trimmedCurrentPassword = passwords.currentPassword.trim();
    const trimmedNewPassword = passwords.newPassword.trim();
    const trimmedConfirmPassword = passwords.confirmNewPassword.trim();

    const isPasswordValid =
        trimmedNewPassword.length >= 8 &&
        /[A-Z]/.test(trimmedNewPassword) &&
        /[0-9]/.test(trimmedNewPassword) &&
        /[^A-Za-z0-9]/.test(trimmedNewPassword) &&
        trimmedNewPassword === trimmedConfirmPassword &&
        trimmedCurrentPassword.length > 0;

    const planStatusLabels: Record<string, string> = {
        active: 'Active',
        trialing: 'Trialing',
        past_due: 'Past Due',
        cancelled: 'Cancelled',
        cancel_pending: 'Cancellation Pending'
    };

    const planStatusBadges: Record<string, string> = {
        active: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
        trialing: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
        past_due: 'bg-amber-100 text-amber-700 border border-amber-200',
        cancelled: 'bg-rose-100 text-rose-700 border border-rose-200',
        cancel_pending: 'bg-amber-50 text-amber-700 border border-amber-200'
    };

    const formatCurrency = (amount?: number, currency = 'USD') => {
        if (typeof amount !== 'number' || Number.isNaN(amount)) {
            return null;
        }
        return amount.toLocaleString(undefined, {
            style: 'currency',
            currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const formatDate = (iso?: string | null) => {
        if (!iso) {
            return null;
        }
        const date = new Date(iso);
        if (Number.isNaN(date.getTime())) {
            return null;
        }
        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

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
            notifyApiError({
                title: 'Could not start billing checkout',
                description: 'Please try again or contact support if the problem continues.',
                error
            });
            setBillingError(error instanceof Error ? error.message : 'Unable to start checkout. Please try again.');
        } finally {
            setIsBillingCheckoutLoading(false);
        }
    };

    // Billing handlers
    const handlePayPalCheckout = () => {
        if (billingData.managedBy && billingData.managedBy !== 'paypal') {
            setBillingError(`Your subscription is managed via ${billingData.managedBy}. Please use the ${billingData.managedBy === 'stripe' ? 'Stripe customer portal' : 'billing team'} to make changes.`);
            return;
        }
        if (!paypalAvailable) {
            setBillingError('PayPal is not available. Please contact support.');
            return;
        }
        if (paypalPortalUrl) {
            setBillingMessage('Opening PayPal in a new tab.');
            window.open(paypalPortalUrl, '_blank');
            return;
        }
        void launchBillingCheckout('paypal');
    };

    const handleContactSupport = () => {
        window.open('mailto:support@homelistingai.com?subject=Billing Support Request', '_blank');
    };

    const handleCancelMembership = async () => {
        if (!userId) {
            setBillingError('Missing account identifier. Please refresh and try again.');
            return;
        }

        const confirmed = confirm('Are you sure you want to cancel your membership? You will lose access to all AI features at the end of your current billing period.');
        if (!confirmed) {
            return;
        }

        setBillingMessage(null);
        setBillingError(null);
        setIsBillingSettingsLoading(true);

        try {
            const updated = await billingSettingsService.update(userId, {
                planStatus: 'cancel_pending',
                cancellationRequestedAt: new Date().toISOString()
            });

            billingDefaultsRef.current = updated;
            setBillingData(updated);
            setPlanBadge(prev => ({
                plan: updated.planName || prev?.plan,
                status: updated.planStatus || prev?.status
            }));
            _onSaveBillingSettings(updated);
            setBillingMessage('Cancellation request submitted. You will receive a confirmation email shortly.');
        } catch (error) {
            notifyApiError({
                title: 'Could not submit cancellation request',
                description: 'Please try again or contact support if the problem continues.',
                error
            });
            setBillingError(error instanceof Error ? error.message : 'Failed to submit cancellation request.');
        } finally {
            setIsBillingSettingsLoading(false);
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
                notifyApiError({
                    title: 'Could not update notification preference',
                    description: 'We reverted the previous setting. Please try again.',
                    error
                });
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
        [currentNotifications, notifyApiError, userId, _onSaveNotifications]
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
            notifyApiError({
                title: 'Could not save email settings',
                description: 'Please review your details and try again.',
                error
            });
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


    const tabs = [
        { id: 'profile', label: 'Profile', icon: 'account_circle' },
        { id: 'notifications', label: 'Notifications', icon: 'notifications' },
        { id: 'email', label: 'Email', icon: 'mail' },
        { id: 'calendar', label: 'Calendar', icon: 'calendar_today' },
        { id: 'security', label: 'Security', icon: 'shield' },
        { id: 'billing', label: 'Billing', icon: 'credit_card' },
    ];

    const paypalAvailable = paymentProviders.includes('paypal');
    const subscriptionManagedBy = billingData.managedBy || (paypalAvailable ? 'paypal' : undefined);
    const planAmountFormatted = formatCurrency(billingData.amount, billingData.currency ?? 'USD');
    const renewalDateLabel = formatDate(billingData.renewalDate);
    const cancellationRequestedLabel = formatDate(billingData.cancellationRequestedAt);
    const billingHistoryEntries = Array.isArray(billingData.history) ? billingData.history : [];
    const canCancelPlan = !['cancel_pending', 'cancelled'].includes(billingData.planStatus ?? '');
    const showCancellationNotice = billingData.planStatus === 'cancel_pending' && !!cancellationRequestedLabel;
    const billingStatusBadges: Record<string, string> = {
        Paid: 'bg-emerald-100 text-emerald-700',
        Pending: 'bg-amber-100 text-amber-700',
        Failed: 'bg-rose-100 text-rose-700'
    };
    const manageButtonLabel = (() => {
        if (subscriptionManagedBy === 'paypal') {
            return isBillingCheckoutLoading ? 'Opening PayPal…' : 'Manage with PayPal';
        }
        if (subscriptionManagedBy === 'stripe') {
            return 'Managed via Stripe';
        }
        if (subscriptionManagedBy === 'manual') {
            return 'Contact billing';
        }
        return 'Manage subscription';
    })();
    const manageButtonDisabled =
        subscriptionManagedBy !== 'paypal' || !paypalAvailable || isBillingCheckoutLoading;
    const cancelButtonDisabled = !canCancelPlan || isBillingSettingsLoading;
    const cancelButtonLabel = canCancelPlan
        ? 'Cancel Plan'
        : billingData.planStatus === 'cancel_pending'
            ? 'Cancellation Pending'
            : 'Plan Cancelled';
    const historyDescriptionFallback = billingData.planName
        ? `${billingData.planName} - Subscription`
        : 'Subscription payment';

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
                        {activeTab === 'profile' && (
                            <div className="p-8 space-y-8">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">👤 Profile & Branding</h2>
                                    <p className="text-slate-500 mt-1">
                                        Manage your agent profile and branding settings.
                                    </p>
                                </div>

                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
                                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="material-symbols-outlined text-3xl">badge</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">Your AI Card is your Profile</h3>
                                    <p className="text-slate-600 max-w-lg mx-auto mb-8">
                                        We've centralized your profile management. Your AI Card now serves as the single source of truth for your agent details, branding, and contact info across the entire platform.
                                    </p>
                                    <a
                                        href="#/ai-card"
                                        onClick={(e) => {
                                            if (onNavigateToAICard) {
                                                e.preventDefault();
                                                onNavigateToAICard();
                                            }
                                        }}
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                                    >
                                        <span className="material-symbols-outlined">edit_square</span>
                                        Edit AI Card Profile
                                    </a>
                                </div>
                            </div>
                        )}
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

                                        {/* Email Service Setup */}
                                        <div className="bg-white rounded-lg border border-slate-200 p-6">
                                            <h3 className="text-lg font-semibold text-slate-800 mb-4">📬 Email Service</h3>
                                            <p className="text-sm text-slate-600 mb-4">
                                                Your platform uses Mailgun for sending automated emails and follow-up sequences.
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
                                                            isGoogleIntegrationAvailable ? (
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
                                                            ) : (
                                                                <div className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                                                    <div className="font-semibold text-slate-700 mb-1">Gmail OAuth disabled</div>
                                                                    Add Google OAuth credentials (`GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`, and set `VITE_ENABLE_GOOGLE_INTEGRATIONS=true`) then restart the dev server to enable one-click Gmail connections. Until then, use the forwarding address above.
                                                                </div>
                                                            )
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

                                {isSecuritySettingsLoading && (
                                    <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                                        Loading your security preferences…
                                    </div>
                                )}

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
                                    <form onSubmit={handlePasswordSave} className="mt-4 space-y-4 max-w-md">
                                        <FormInput
                                            label="Current Password"
                                            id="currentPassword"
                                            name="currentPassword"
                                            type="password"
                                            autoComplete="current-password"
                                            value={passwords.currentPassword}
                                            onChange={handlePasswordChange}
                                        />
                                        <FormInput
                                            label="New Password"
                                            id="newPassword"
                                            name="newPassword"
                                            type="password"
                                            autoComplete="new-password"
                                            value={passwords.newPassword}
                                            onChange={handlePasswordChange}
                                        />
                                        <FormInput
                                            label="Confirm New Password"
                                            id="confirmNewPassword"
                                            name="confirmNewPassword"
                                            type="password"
                                            autoComplete="new-password"
                                            value={passwords.confirmNewPassword}
                                            onChange={handlePasswordChange}
                                        />
                                        <div>
                                            <button
                                                type="submit"
                                                disabled={isSecuritySaving || !isPasswordValid}
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
                                            <p className="text-sm text-slate-500 mt-1">Google Calendar is ready to connect below.</p>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
                                            <IntegrationCard
                                                icon="calendar_month"
                                                title="Google Calendar"
                                                description="Sync with your Google account for seamless scheduling."
                                                tags={[{ label: 'Popular', color: 'blue' }]}
                                                isSelected
                                                onClick={() => handleCalendarSettingsChange('integrationType', 'google')}
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
                                                After selecting Google Calendar, connect your account below to enable automatic scheduling.
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
                                                    autoComplete="current-password"
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
                                                    autoComplete="new-password"
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
                                                    autoComplete="new-password"
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
                                                    disabled={isSecuritySettingsLoading || isSecuritySaving}
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
                                                disabled={isSecuritySettingsLoading || isSecuritySaving}
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
                                                    disabled={isSecuritySettingsLoading || isSecuritySaving}
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
                                            disabled={isSecuritySaving || isSecuritySettingsLoading}
                                            className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {isSecuritySaving ? 'Saving…' : 'Save Security Settings'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}


                        {activeTab === 'billing' && (
                            <div className="p-8 space-y-8">
                                <div>
                                    <div className="flex items-center justify-between gap-3">
                                        <h2 className="text-2xl font-bold text-slate-900">💳 Billing & Subscription</h2>
                                        {planBadge && (planBadge.plan || planBadge.status) && (
                                            <div className="flex items-center gap-2">
                                                {planBadge.plan && (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-200">
                                                        Plan: {planBadge.plan}
                                                    </span>
                                                )}
                                                {planBadge.status && (
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${planStatusBadges[planBadge.status] ?? 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                        {planStatusLabels[planBadge.status] ?? planBadge.status}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-slate-500 mt-1">Manage your subscription, billing information, and payment methods.</p>
                                </div>
                                {isBillingSettingsLoading && (
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                                        Loading your billing details…
                                    </div>
                                )}
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
                                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <h3 className="text-2xl font-bold text-white">{billingData.planName || 'Subscription Plan'}</h3>
                                                    {billingData.planStatus && (
                                                        <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${planStatusBadges[billingData.planStatus] ?? 'bg-white/20 text-white border border-white/30'}`}>
                                                            {planStatusLabels[billingData.planStatus] ?? billingData.planStatus}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-2 text-slate-300">Everything you need to dominate your market and close more deals.</p>
                                                {renewalDateLabel && (
                                                    <p className="mt-2 text-sm text-white/80">Renews on {renewalDateLabel}</p>
                                                )}
                                                {subscriptionManagedBy && subscriptionManagedBy !== 'paypal' && (
                                                    <p className="mt-1 text-xs text-white/80">
                                                        Managed by {subscriptionManagedBy === 'manual' ? 'our billing team' : subscriptionManagedBy}.
                                                    </p>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                {planAmountFormatted ? (
                                                    <div className="text-3xl font-bold">
                                                        {planAmountFormatted}
                                                        <span className="text-lg font-medium">/mo</span>
                                                    </div>
                                                ) : (
                                                    <div className="text-xl font-semibold">Custom Pricing</div>
                                                )}
                                                {cancellationRequestedLabel && billingData.planStatus === 'cancel_pending' && (
                                                    <p className="mt-2 text-sm text-white/80">Access ends after the current period.</p>
                                                )}
                                            </div>
                                        </div>

                                        {showCancellationNotice && (
                                            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
                                                Cancellation requested on {cancellationRequestedLabel}. You&apos;ll keep access until the end of this billing period.
                                            </div>
                                        )}

                                        <div className="mt-6 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                                            {[
                                                'Unlimited AI interactions per month',
                                                'Advanced analytics dashboard',
                                                'Automated follow-up sequences',
                                                'Your AI sidekick trained on your brand',
                                                'Lead capture to closing automations',
                                                'Custom programs available any time'
                                            ].map((feature) => (
                                                <div key={feature} className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined w-4 h-4 text-green-300">check_circle</span>
                                                    <span>{feature}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-6 flex flex-wrap gap-3">
                                            <button
                                                type="button"
                                                onClick={handlePayPalCheckout}
                                                disabled={manageButtonDisabled}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-white/40 bg-white/15 text-white font-semibold shadow transition-colors ${manageButtonDisabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-white/25'}`}
                                            >
                                                <span className="material-symbols-outlined text-base">account_balance</span>
                                                {manageButtonLabel}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleCancelMembership}
                                                disabled={cancelButtonDisabled}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 bg-white/10 text-white transition-colors ${cancelButtonDisabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-white/20'}`}
                                            >
                                                <span className="material-symbols-outlined text-base">cancel</span>
                                                {cancelButtonLabel}
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
                                        <p className="mt-2 text-xs text-white/90">Changes to your subscription are managed securely through your configured payment provider.</p>
                                        {!paypalAvailable && subscriptionManagedBy === 'paypal' && (
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
                                                    {billingHistoryEntries.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={5} className="px-6 py-6 text-center text-sm text-slate-500">
                                                                No invoices yet. Once you&apos;re billed, receipts will appear here.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        billingHistoryEntries.map((entry) => {
                                                            const amountLabel =
                                                                formatCurrency(entry.amount, billingData.currency ?? 'USD') ??
                                                                `$${Number(entry.amount || 0).toFixed(2)}`;
                                                            const dateLabel = formatDate(entry.date) ?? entry.date;
                                                            return (
                                                                <tr key={entry.id}>
                                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{dateLabel}</td>
                                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                                                                        {entry.description || historyDescriptionFallback}
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{amountLabel}</td>
                                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                                        <span className={`px-2 py-1 text-xs font-medium rounded ${billingStatusBadges[entry.status] ?? 'bg-slate-100 text-slate-700'}`}>
                                                                            {entry.status}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                                        {entry.invoiceUrl ? (
                                                                            <a
                                                                                href={entry.invoiceUrl}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="text-primary-600 hover:text-primary-700"
                                                                            >
                                                                                Download
                                                                            </a>
                                                                        ) : (
                                                                            <span className="text-slate-400">Not available</span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
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
