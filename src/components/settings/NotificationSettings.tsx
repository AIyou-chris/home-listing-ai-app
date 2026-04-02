import React, { useState, useEffect } from 'react';
import { NotificationSettings, AgentProfile } from '../../types';
import { FeatureSection, ToggleSwitch } from './SettingsCommon';
import UpgradePromptModal from '../billing/UpgradePromptModal';
import { createBillingCheckoutSession, fetchDashboardBilling, type PlanId } from '../../services/dashboardBillingService';
import { textingService } from '../../services/textingService';

interface NotificationSettingsProps {
    settings: NotificationSettings;
    onSave: (settings: NotificationSettings) => Promise<void>;
    onBack?: () => void;
    isLoading?: boolean;
    userProfile?: AgentProfile;
    onSaveProfile?: (profile: AgentProfile) => Promise<void>;
    smsAvailable?: boolean;
    smsChannel?: 'coming_soon' | 'active';
}

type NotificationSettingKey = keyof NotificationSettings;

const NOTIFICATION_GROUPS: Array<{
    title: string;
    icon: string;
    items: Array<{ key: NotificationSettingKey; label: string; description: string }>;
}> = [
        {
            title: 'Email Nudges',
            icon: 'mail',
            items: [
                {
                    key: 'email_enabled',
                    label: 'Email alerts',
                    description: 'Enable actionable email notifications'
                },
                {
                    key: 'daily_digest_enabled',
                    label: 'Daily digest',
                    description: 'Send one morning summary email'
                },
                {
                    key: 'unworked_lead_nudge_enabled',
                    label: 'Unworked lead nudge',
                    description: 'Alert when a new lead is still unworked after 10 minutes'
                },
                {
                    key: 'appt_confirm_nudge_enabled',
                    label: 'Appointment confirmation nudge',
                    description: 'Remind you when upcoming appointments still need confirmation'
                },
                {
                    key: 'reschedule_nudge_enabled',
                    label: 'Reschedule requested nudge',
                    description: 'Notify immediately when a lead asks to reschedule'
                }
            ]
        },
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
                    key: 'voiceAppointmentReminders',
                    label: 'Appointment reminder calls',
                    description: 'Allow AI voice calls only for scheduled appointment reminders'
                },
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
    isLoading = false,
    userProfile,
    onSaveProfile,
    smsAvailable = false,
    smsChannel = 'coming_soon'
}) => {
    const [localSettings, setLocalSettings] = useState<NotificationSettings>(settings);
    const [isSaving, setIsSaving] = useState(false);
    const [planId, setPlanId] = useState<PlanId>('free');
    const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
    const [upgradeLoading, setUpgradeLoading] = useState(false);
    const [testPhone, setTestPhone] = useState('');
    const [sendingTestSms, setSendingTestSms] = useState(false);
    const [testSmsStatus, setTestSmsStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const smsComingSoon = !smsAvailable || smsChannel === 'coming_soon';
    const remindersProLocked = planId !== 'pro';
    // const [sendingTest, setSendingTest] = useState(false); // Removed unused state

    useEffect(() => {
        if (settings) {
            setLocalSettings(settings);
        }
    }, [settings]);

    const [replyToEmail, setReplyToEmail] = useState<string>('');

    useEffect(() => {
        if (userProfile?.email) {
            setReplyToEmail(userProfile.email);
        }
    }, [userProfile]);

    useEffect(() => {
        if (userProfile?.phone) {
            setTestPhone(userProfile.phone);
        }
    }, [userProfile]);

    useEffect(() => {
        let isMounted = true;
        const loadPlan = async () => {
            try {
                const billing = await fetchDashboardBilling();
                if (!isMounted) return;
                if (billing?.plan?.id) setPlanId(billing.plan.id);
            } catch (_error) {
                if (isMounted) setPlanId('free');
            }
        };
        void loadPlan();
        return () => {
            isMounted = false;
        };
    }, []);

    const handleToggle = (key: NotificationSettingKey, enabled: boolean) => {
        if (smsComingSoon && key === 'smsNewLeadAlerts') return;
        if (remindersProLocked && key === 'voiceAppointmentReminders') {
            setUpgradeModalOpen(true);
            return;
        }
        setLocalSettings(prev => ({ ...prev, [key]: enabled }));
    };

    const handleFieldChange = (key: 'digest_time_local' | 'timeZone', value: string) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
    };

    // const handleInputChange = ... // Removed unused handler
    // const handleSendTest = ... // Removed unused handler

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave(localSettings);
            if (onSaveProfile && userProfile && replyToEmail !== userProfile.email) {
                await onSaveProfile({ ...userProfile, email: replyToEmail });
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleSendTestSms = async () => {
        const trimmedPhone = testPhone.trim();
        if (!trimmedPhone) {
            setTestSmsStatus({ type: 'error', message: 'Add a phone number first.' });
            return;
        }

        setSendingTestSms(true);
        setTestSmsStatus(null);

        try {
            const ok = await textingService.sendSms(trimmedPhone, 'hi');
            if (ok) {
                setTestSmsStatus({ type: 'success', message: 'Test text sent. Check your phone for "hi".' });
            } else {
                setTestSmsStatus({ type: 'error', message: 'SMS send failed. Check backend logs.' });
            }
        } catch (_error) {
            setTestSmsStatus({ type: 'error', message: 'SMS send failed. Check backend logs.' });
        } finally {
            setSendingTestSms(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-8 space-y-8 animate-fadeIn">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">🔔 Notification Preferences</h2>
                <p className="text-slate-500 mt-1">Choose how and when you want to be notified.</p>
            </div>

            <FeatureSection title="Email Delivery Settings" icon="forward_to_inbox">
                <div className="space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <label className="flex-1 space-y-1 opacity-70 cursor-not-allowed">
                            <span className="text-sm font-medium text-slate-700">Sender Identity (System)</span>
                            <input
                                type="text"
                                value="HomeListingAI"
                                disabled
                                className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-500 cursor-not-allowed"
                            />
                            <p className="text-xs text-slate-500">Emails are reliably sent from our secure system infrastructure.</p>
                        </label>
                        <label className="flex-1 space-y-1">
                            <span className="text-sm font-medium text-slate-700">Reply Goes To (Your Email)</span>
                            <input
                                type="email"
                                value={replyToEmail}
                                onChange={(e) => setReplyToEmail(e.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                                placeholder="you@example.com"
                            />
                            <p className="text-xs text-slate-500">When clients reply to automated emails, they will go here. Must be the primary address for this account.</p>
                        </label>
                    </div>
                </div>
            </FeatureSection>

            {NOTIFICATION_GROUPS.map((group) => (
                <FeatureSection key={group.title} title={group.title} icon={group.icon}>
                    <div className="space-y-4">
                        {group.items.map((item) => (
                            <div key={item.key} className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                                <div>
                                    <h4 className="font-medium text-slate-900 flex items-center gap-2">
                                        {item.label}
                                        {smsComingSoon && item.key === 'smsNewLeadAlerts' && (
                                            <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
                                                Unavailable
                                            </span>
                                        )}
                                        {item.key === 'voiceAppointmentReminders' && (
                                            <span className="inline-flex items-center rounded-full bg-indigo-100 text-indigo-700 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
                                                PRO
                                            </span>
                                        )}
                                    </h4>
                                    <p className="text-sm text-slate-500">
                                        {smsComingSoon && item.key === 'smsNewLeadAlerts'
                                            ? 'SMS alerts are not enabled on this account yet.'
                                            : remindersProLocked && item.key === 'voiceAppointmentReminders'
                                                ? 'Pro feature — includes appointment reminder calls.'
                                                : item.description}
                                    </p>
                                    {remindersProLocked && item.key === 'voiceAppointmentReminders' && (
                                        <button
                                            type="button"
                                            onClick={() => setUpgradeModalOpen(true)}
                                            className="mt-2 rounded-md border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700"
                                        >
                                            Upgrade to Pro
                                        </button>
                                    )}
                                </div>
                                <ToggleSwitch
                                    enabled={!!localSettings[item.key]}
                                    onChange={(val) => handleToggle(item.key, val)}
                                    disabled={
                                        isLoading ||
                                        isSaving ||
                                        (smsComingSoon && item.key === 'smsNewLeadAlerts') ||
                                        (remindersProLocked && item.key === 'voiceAppointmentReminders')
                                    }
                                />
                            </div>
                        ))}
                    </div>

                </FeatureSection >
            ))}

            <FeatureSection title="Digest Schedule" icon="schedule">
                <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-1">
                        <span className="text-sm font-medium text-slate-700">Digest time (local)</span>
                        <input
                            type="time"
                            value={localSettings.digest_time_local || '08:00'}
                            onChange={(event) => handleFieldChange('digest_time_local', event.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                    </label>
                    <label className="space-y-1">
                        <span className="text-sm font-medium text-slate-700">Timezone</span>
                        <input
                            type="text"
                            value={localSettings.timeZone || 'America/Los_Angeles'}
                            onChange={(event) => handleFieldChange('timeZone', event.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            placeholder="America/Los_Angeles"
                        />
                    </label>
                </div>
            </FeatureSection>

            <FeatureSection title="SMS Test" icon="sms">
                <div className="space-y-4">
                    <div>
                        <label className="space-y-1 block">
                            <span className="text-sm font-medium text-slate-700">Test phone number</span>
                            <input
                                type="tel"
                                value={testPhone}
                                onChange={(event) => setTestPhone(event.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                placeholder="206-555-1234"
                                disabled={smsComingSoon || sendingTestSms}
                            />
                        </label>
                        <p className="mt-2 text-xs text-slate-500">This sends one simple test text: <span className="font-semibold text-slate-700">hi</span></p>
                    </div>

                    {testSmsStatus && (
                        <div className={`rounded-lg border px-3 py-2 text-sm ${testSmsStatus.type === 'success'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-rose-200 bg-rose-50 text-rose-700'
                            }`}>
                            {testSmsStatus.message}
                        </div>
                    )}

                    <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-slate-500">
                            {smsComingSoon ? 'SMS is not live on this account yet.' : 'Use this to prove your SMS setup works before launch.'}
                        </p>
                        <button
                            type="button"
                            onClick={() => void handleSendTestSms()}
                            disabled={smsComingSoon || sendingTestSms || !testPhone.trim()}
                            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {sendingTestSms ? 'Sending…' : 'Send Test SMS'}
                        </button>
                    </div>
                </div>
            </FeatureSection>

            <div className="flex items-center justify-end pt-8 border-t border-slate-200">
                <button
                    type="submit"
                    disabled={isSaving || isLoading}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isSaving ? 'Saving…' : 'Save Notifications'}
                </button>
            </div>
            <UpgradePromptModal
                isOpen={upgradeModalOpen}
                title="You’re at your limit."
                body="Upgrade to keep capturing leads and sending reports without interruptions."
                reasonLine="Reminder calls are included in Pro."
                allowPromoCode
                upgrading={upgradeLoading}
                onClose={() => setUpgradeModalOpen(false)}
                onUpgrade={(promoCode) => {
                    void (async () => {
                        try {
                            setUpgradeLoading(true);
                            const checkout = await createBillingCheckoutSession('pro', promoCode);
                            if (!checkout.url) throw new Error('Missing checkout URL');
                            window.location.href = checkout.url;
                        } catch (error) {
                            console.error('Failed to start Pro checkout from notifications settings:', error);
                        } finally {
                            setUpgradeLoading(false);
                        }
                    })();
                }}
            />
        </form >
    );
};

export default NotificationSettingsPage;
