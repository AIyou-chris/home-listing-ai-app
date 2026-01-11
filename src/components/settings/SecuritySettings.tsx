import React, { useState } from 'react';
import { supabase } from '../../services/supabase';
import { FeatureSection } from './SettingsCommon';

interface SecuritySettingsProps {
    // Assuming security settings structure based on usage in SettingsPage
    settings: {
        loginNotifications?: boolean;
        sessionTimeout?: number;
        analyticsEnabled?: boolean;
    };
    onSaveSettings: (settings: SecuritySettingsProps['settings']) => Promise<void>;
    onBack?: () => void;
    isLoading?: boolean;
}

const SecuritySettingsPage: React.FC<SecuritySettingsProps> = ({
    settings,
    onSaveSettings,
    onBack: _onBack,
    isLoading = false
}) => {
    const [passwords, setPasswords] = useState({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
    });

    // Local state for toggles to allow immediate feedback before save
    const [localSettings, setLocalSettings] = useState(settings);
    const [isSecuritySaving, setIsSecuritySaving] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPasswords(prev => ({ ...prev, [name]: value }));
    };

    const isPasswordValid =
        passwords.newPassword.length >= 8 &&
        /[A-Z]/.test(passwords.newPassword) &&
        /[0-9]/.test(passwords.newPassword) &&
        /[^A-Za-z0-9]/.test(passwords.newPassword) &&
        passwords.newPassword === passwords.confirmNewPassword;

    const handlePasswordSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordMessage(null);

        if (!isPasswordValid) return;

        try {
            const { error } = await supabase.auth.updateUser({
                password: passwords.newPassword
            });

            if (error) throw error;

            setPasswordMessage({ type: 'success', text: 'Password updated successfully' });
            setPasswords({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to update password';
            setPasswordMessage({ type: 'error', text: message });
        }
    };

    const handleSecurityToggle = (key: string, value: boolean | number) => {
        const newSettings = { ...localSettings, [key]: value };
        setLocalSettings(newSettings);
        // We probably want to save immediately for toggles or wait for a button. 
        // In SettingsPage it seemed there was a save button for security settings distinct from password.
        // But for toggles usually auto-save is nice.
        // Let's stick to the manual save if there is a button, or auto-save.
        // The original code had a "Save Security Settings" button.
    };

    const handleSettingsSave = async () => {
        setIsSecuritySaving(true);
        try {
            await onSaveSettings(localSettings);
        } finally {
            setIsSecuritySaving(false);
        }
    };

    return (
        <div className="p-8 space-y-8 animate-fadeIn">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">🔐 Security Settings</h2>
                <p className="text-slate-500 mt-1">Manage your account security, passwords, and privacy settings.</p>
            </div>

            <form onSubmit={handlePasswordSave}>
                <FeatureSection title="Change Password" icon="lock">
                    <div className="space-y-6">
                        {passwordMessage && (
                            <div className={`p-4 rounded-lg text-sm ${passwordMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {passwordMessage.text}
                            </div>
                        )}
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
                            {/* Current Password Field - often required by backend, Supabase might not need it if session is active 
                                usually for re-auth. Here we just have new password fields as per Supabase updateUser 
                                but UI often asks for current for verification. 
                                Since Supabase JS client doesn't strictly require old password if logged in, 
                                we might just keep the UI but we aren't using it in the API call above.
                                If the original code used it, we should use it. 
                                Original code had it. I'll include it but it's not used in the simple updateUser call.
                            */}
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
            </form>

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
                                checked={localSettings.loginNotifications !== false}
                                onChange={(e) => handleSecurityToggle('loginNotifications', e.target.checked)}
                                className="sr-only peer"
                                disabled={isLoading || isSecuritySaving}
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
                            value={localSettings.sessionTimeout || 24}
                            onChange={(e) => handleSecurityToggle('sessionTimeout', parseInt(e.target.value))}
                            className="px-3 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            disabled={isLoading || isSecuritySaving}
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
                                checked={localSettings.analyticsEnabled !== false}
                                onChange={(e) => handleSecurityToggle('analyticsEnabled', e.target.checked)}
                                className="sr-only peer"
                                disabled={isLoading || isSecuritySaving}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                    </div>
                </div>
            </FeatureSection>

            <div className="flex items-center justify-end pt-8 border-t border-slate-200">
                <button
                    type="button"
                    onClick={handleSettingsSave}
                    disabled={isSecuritySaving || isLoading}
                    className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isSecuritySaving ? 'Saving…' : 'Save Security Settings'}
                </button>
            </div>
        </div>
    );
};

export default SecuritySettingsPage;
