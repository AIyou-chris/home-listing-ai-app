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
        },
        {
            title: 'SMS & Mobile',
            icon: 'smartphone',
            items: [
                {
                    key: 'smsNewLeadAlerts',
                    label: 'New Lead SMS',
                    description: 'Receive instant text messages when a new lead is captured'
                },
                {
                    key: 'browserNotifications',
                    label: 'Browser Push',
                    description: 'Get desktop notifications when you are online'
                }
            ]
        }
    ];

const NotificationSettingsPage: React.FC<NotificationSettingsProps> = ({
    settings,
    onSave,
    onBack: _onBack,
    isLoading = false
}) => {
    const [localSettings, setLocalSettings] = useState<NotificationSettings>(settings);
    const [isSaving, setIsSaving] = useState(false);
    // const [sendingTest, setSendingTest] = useState(false); // Removed unused state

    useEffect(() => {
        if (settings) {
            setLocalSettings(settings);
        }
    }, [settings]);

    const handleToggle = (key: NotificationSettingKey, enabled: boolean) => {
        setLocalSettings(prev => ({ ...prev, [key]: enabled }));
    };

    // const handleInputChange = ... // Removed unused handler
    // const handleSendTest = ... // Removed unused handler

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
                    </div>

                </FeatureSection >
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
        </form >
    );
};

export default NotificationSettingsPage;
