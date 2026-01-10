import React, { useState, useEffect } from 'react';
import { CalendarSettings } from '../../types';
import { FeatureSection } from './SettingsCommon';

interface CalendarSettingsProps {
    settings: CalendarSettings;
    onSave: (settings: CalendarSettings) => Promise<void>;
    onBack?: () => void;
    isLoading?: boolean;
}

const CalendarSettingsPage: React.FC<CalendarSettingsProps> = ({
    settings,
    onSave,
    onBack,
    isLoading = false
}) => {
    const [formData, setFormData] = useState<CalendarSettings>(settings);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (settings) {
            setFormData(settings);
        }
    }, [settings]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            // Check if nested property update is needed (e.g. workingHours)
            // Simplified handling for flat check, but assuming structure:
            // settings.workingHours.start, etc.

            // This needs to be robust.
            // If name is 'startTime', update workingHours.start
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
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
                </div>
            </FeatureSection>

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
                                checked={formData.emailReminders !== false}
                                onChange={(e) => handleToggle('emailReminders', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                    </div>
                </div>
            </FeatureSection>

            <div className="flex items-center justify-between pt-8 border-t border-slate-200">
                {onBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        className="px-6 py-2 text-slate-600 hover:text-slate-800 transition-colors"
                    >
                        ← Back to Dashboard
                    </button>
                )}
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
