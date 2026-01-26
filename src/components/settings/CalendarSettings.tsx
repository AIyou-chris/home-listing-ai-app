import React, { useState, useEffect } from 'react';
import { CalendarSettings } from '../../types';
import { FeatureSection, ToggleSwitch } from './SettingsCommon';
import { googleOAuthService } from '../../services/googleOAuthService';

interface CalendarSettingsProps {
    settings: CalendarSettings;
    onSave: (settings: CalendarSettings) => Promise<void>;
    onBack?: () => void;
    isLoading?: boolean;
}

const CalendarSettingsPage: React.FC<CalendarSettingsProps> = ({
    settings,
    onSave,
    onBack: _onBack,
    isLoading = false
}) => {
    const [formData, setFormData] = useState<CalendarSettings>(settings);
    const [isSaving, setIsSaving] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [userEmail, setUserEmail] = useState<string | null>(null);

    useEffect(() => {
        if (settings) {
            setFormData(settings);
        }
    }, [settings]);

    useEffect(() => {
        const checkAuth = async () => {
            const authed = await googleOAuthService.isAuthenticated('calendar');
            if (authed) {
                const email = await googleOAuthService.getUserEmail('calendar');
                setUserEmail(email);
            }
        };
        checkAuth();
    }, []);

    const handleConnectGoogle = async () => {
        setIsConnecting(true);
        try {
            await googleOAuthService.requestAccess({ context: 'calendar' });
            const email = await googleOAuthService.getUserEmail('calendar');

            setUserEmail(email);
            setFormData(prev => ({ ...prev, integrationType: 'google' }));
        } catch (error) {
            console.error('Failed to connect Google Calendar:', error);
        } finally {
            setIsConnecting(false);
        }
    };

    const handleDisconnectGoogle = async () => {
        try {
            await googleOAuthService.logout('calendar');
            setUserEmail(null);
            setFormData(prev => ({ ...prev, integrationType: null }));
        } catch (error) {
            console.error('Failed to disconnect Google Calendar:', error);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            if (name === 'startTime') {
                return { ...prev, workingHours: { ...prev.workingHours, start: value } };
            }
            if (name === 'endTime') {
                return { ...prev, workingHours: { ...prev.workingHours, end: value } };
            }

            return { ...prev, [name]: value };
        });
    };

    const handleWorkingDayToggle = (day: string, checked: boolean) => {
        setFormData(prev => {
            const currentDays = prev.workingDays || [];
            if (checked) {
                return { ...prev, workingDays: [...currentDays, day] };
            } else {
                return { ...prev, workingDays: currentDays.filter(d => d !== day) };
            }
        });
    };

    const handleToggle = (key: keyof CalendarSettings, value: boolean) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave(formData);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-8 space-y-8 animate-fadeIn">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">📅 Calendar Settings</h2>
                <p className="text-slate-500 mt-1">Configure your availability and booking preferences.</p>
            </div>

            <FeatureSection title="Google Calendar Connection" icon="link">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-white w-6 h-6">calendar_today</span>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">Google Calendar Integration</h3>
                            <p className="text-sm text-slate-600 mb-4">
                                Sync your consultations with Google Calendar to avoid double bookings and automatically generate Meet links for clients.
                            </p>

                            {userEmail ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-green-700 font-medium">
                                        <span className="material-symbols-outlined text-base">check_circle</span>
                                        <span>Connected as {userEmail}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleDisconnectGoogle}
                                        className="text-sm text-red-600 hover:text-red-700 font-semibold underline"
                                    >
                                        Disconnect Google Calendar
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleConnectGoogle}
                                    disabled={isConnecting}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-base">link</span>
                                    {isConnecting ? 'Connecting...' : 'Connect Google Calendar'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </FeatureSection>

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
                                    value={formData.workingHours?.start || '09:00'}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 mb-1" htmlFor="calendar-end-time">End Time</label>
                                <input
                                    type="time"
                                    name="endTime"
                                    id="calendar-end-time"
                                    value={formData.workingHours?.end || '17:00'}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900"
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
                                        checked={formData.workingDays?.includes(day.toLowerCase()) || false}
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
                            value={formData.defaultDuration || 30}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900"
                        >
                            <option value={15}>15 minutes</option>
                            <option value={30}>30 minutes</option>
                            <option value={45}>45 minutes</option>
                            <option value={60}>1 hour</option>
                            <option value={90}>1.5 hours</option>
                        </select>
                        <p className="text-xs text-slate-500 mt-2">Default length for new consultations</p>
                    </div>
                </div>
            </FeatureSection>

            <FeatureSection title="Calendar Notifications" icon="notifications">
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div>
                            <h4 className="font-semibold text-slate-800">Email Reminders</h4>
                            <p className="text-sm text-slate-500">Send automatic email reminders to clients</p>
                        </div>
                        <ToggleSwitch
                            enabled={formData.emailReminders !== false}
                            onChange={(val) => handleToggle('emailReminders', val)}
                            disabled={isLoading || isSaving}
                        />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div>
                            <h4 className="font-semibold text-slate-800">SMS Reminders</h4>
                            <p className="text-sm text-slate-500">Send text message reminders before appointments</p>
                        </div>
                        <ToggleSwitch
                            enabled={!!formData.smsReminders}
                            onChange={(val) => handleToggle('smsReminders', val)}
                            disabled={isLoading || isSaving}
                        />
                    </div>
                </div>
            </FeatureSection>


            <div className="flex items-center justify-between pt-8 border-t border-slate-200">
                <button
                    type="submit"
                    disabled={isSaving || isLoading}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60 ml-auto"
                >
                    {isSaving ? 'Saving…' : 'Save Calendar Settings'}
                </button>
            </div>
        </form>
    );
};

export default CalendarSettingsPage;
