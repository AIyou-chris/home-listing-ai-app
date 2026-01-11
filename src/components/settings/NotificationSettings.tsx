import React, { useState, useEffect } from 'react';
import { NotificationSettings } from '../../types';
import { FeatureSection, ToggleSwitch } from './SettingsCommon';

interface NotificationSettingsProps {
    settings: NotificationSettings;
    onSave: (settings: NotificationSettings) => Promise<void>;
    onBack?: () => void;
    isLoading?: boolean;
}

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
                    description: 'Get notified instantly when a new lead is captured'
                },
                {
                    key: 'leadAction',
                    label: 'Lead takes action',
                    description: 'When a lead replies or books a meeting'
                }
            ]
        },
        {
            title: 'SMS & Phone Alerts',
            icon: 'sms',
            items: [
                {
                    key: 'smsNewLeadAlerts',
                    label: 'New Lead SMS Alerts',
                    description: 'Receive a text message when a high-priority lead arrives'
                }
            ]
        },
        {
            title: 'Email Reports',
            icon: 'mail',
            items: [
                {
                    key: 'dailyDigest',
                    label: 'Daily Digest',
                    description: 'Summary of daily activity and performance'
                },
                {
                    key: 'weeklyReport',
                    label: 'Weekly Report',
                    description: 'Deep dive into your weekly metrics and AI performance'
                }
            ]
        },
        {
            title: 'System Updates',
            icon: 'system_update',
            items: [
                {
                    key: 'marketingUpdates',
                    label: 'Marketing Updates',
                    description: 'New features, tips, and marketing advice'
                },
                {
                    key: 'securityAlerts',
                    label: 'Security Alerts',
                    description: 'Important security notices about your account'
                }
            ]
        }
    ];

const NotificationSettingsPage: React.FC<NotificationSettingsProps> = ({
    settings,
    onSave,
    onBack: _onBack, // Ignored but kept for interface compatibility
    isLoading = false
}) => {
    const [localSettings, setLocalSettings] = useState<NotificationSettings>(settings);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (settings) {
            setLocalSettings(settings);
        }
    }, [settings]);

    const handleToggle = (key: NotificationSettingKey, enabled: boolean) => {
        setLocalSettings(prev => ({ ...prev, [key]: enabled }));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLocalSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave(localSettings);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-8 space-y-8 animate-fadeIn">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">🔔 Notification Preferences</h2>
                <p className="text-slate-500 mt-1">Choose how and when you want to be notified.</p>
            </div>

            {NOTIFICATION_GROUPS.map((group) => (
                <FeatureSection key={group.title} title={group.title} icon={group.icon}>
                    <div className="space-y-4">
                        {group.title === 'SMS & Phone Alerts' && (
                            <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                                <label htmlFor="notificationPhone" className="block text-sm font-medium text-blue-900 mb-1">
                                    Alert Phone Number
                                </label>
                                <input
                                    type="tel"
                                    id="notificationPhone"
                                    name="notificationPhone"
                                    value={localSettings.notificationPhone || ''}
                                    onChange={handleInputChange}
                                    placeholder="+1 (555) 000-0000"
                                    className="w-full px-3 py-2 bg-white border border-blue-200 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900"
                                />
                                <p className="text-xs text-blue-700 mt-2">
                                    This number will be used for all SMS alerts.
                                </p>
                            </div>
                        )}
                        {group.items.map((item) => (
                            <div key={item.key} className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                                <div>
                                    <h4 className="font-medium text-slate-900">{item.label}</h4>
                                    <p className="text-sm text-slate-500">{item.description}</p>
                                </div>
                                <ToggleSwitch
                                    enabled={!!localSettings[item.key]}
                                    onChange={(val) => handleToggle(item.key, val)}
                                    disabled={isLoading || isSaving}
                                />
                            </div>
                        ))}

                        {/* Integrated Compliance & Quiet Hours for SMS Group */}
                        {group.title === 'SMS & Phone Alerts' && (
                            <div className="mt-8 pt-6 border-t border-slate-200 space-y-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="material-symbols-outlined text-slate-400">gavel</span>
                                    <h4 className="font-medium text-slate-900">SMS Compliance & Quiet Hours</h4>
                                </div>

                                {/* Compliance Checkbox */}
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 pt-0.5">
                                            <input
                                                type="checkbox"
                                                id="smsConsent"
                                                name="smsConsent"
                                                checked={localSettings.smsConsent || false}
                                                onChange={(e) => handleToggle('smsConsent', e.target.checked)}
                                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="smsConsent" className="text-sm font-medium text-slate-900 cursor-pointer select-none">
                                                I agree to receive SMS notifications from HomeListingAI
                                            </label>
                                            <p className="text-xs text-slate-500 mt-1">
                                                Required by carrier regulations. We'll send alerts about new leads and urgent updates.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Opt-Out Footer Toggle */}
                                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                                    <div>
                                        <h4 className="font-medium text-slate-900">Include Opt-Out Footer</h4>
                                        <p className="text-sm text-slate-500">Append "Reply STOP to unsubscribe" to initial messages</p>
                                    </div>
                                    <ToggleSwitch
                                        enabled={!!localSettings.smsOptOutMsg}
                                        onChange={(val) => handleToggle('smsOptOutMsg', val)}
                                        disabled={isLoading || isSaving}
                                    />
                                </div>

                                {/* Quiet Hours */}
                                <div className="p-4 bg-slate-50 rounded-lg space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h4 className="font-medium text-slate-900">Quiet Hours</h4>
                                        <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">AI Slumber Mode</span>
                                    </div>
                                    <p className="text-sm text-slate-500 mb-4">Prevent AI texts and calls during these hours (your local time).</p>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 mb-1">Start Time</label>
                                            <input
                                                type="time"
                                                name="smsActiveHoursStart"
                                                value={localSettings.smsActiveHoursStart || '21:00'}
                                                onChange={handleInputChange}
                                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 mb-1">End Time</label>
                                            <input
                                                type="time"
                                                name="smsActiveHoursEnd"
                                                value={localSettings.smsActiveHoursEnd || '08:00'}
                                                onChange={handleInputChange}
                                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 mb-1">Timezone</label>
                                            <select
                                                name="timeZone"
                                                value={localSettings.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone}
                                                onChange={(e) => setLocalSettings(prev => ({ ...prev, timeZone: e.target.value }))}
                                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                            >
                                                {[
                                                    'America/New_York',
                                                    'America/Chicago',
                                                    'America/Denver',
                                                    'America/Los_Angeles',
                                                    'America/Phoenix',
                                                    'America/Anchorage',
                                                    'Pacific/Honolulu'
                                                ].map(tz => (
                                                    <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </FeatureSection>
            ))}

            <div className="flex items-center justify-end pt-8 border-t border-slate-200">
                <button
                    type="submit"
                    disabled={isSaving || isLoading}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isSaving ? 'Saving…' : 'Save Notifications'}
                </button>
            </div>
        </form>
    );
};

export default NotificationSettingsPage;
