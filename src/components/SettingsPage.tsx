import React, { useState } from 'react';
import { AgentProfile, NotificationSettings, EmailSettings, CalendarSettings, BillingSettings, SecuritySettings } from '../types';
import ProfileSettings from './settings/ProfileSettings';
import NotificationSettingsPage from './settings/NotificationSettings';
import SecuritySettingsPage from './settings/SecuritySettings';
import BillingSettingsPage from './settings/BillingSettings';

interface SettingsPageProps {
    userId: string;
    userProfile: AgentProfile;
    profileLoadFailed?: boolean;
    onSaveProfile: (profile: AgentProfile) => Promise<void>;
    notificationSettings: NotificationSettings;
    onSaveNotifications: (settings: NotificationSettings) => Promise<void>;
    billingSettings: BillingSettings;
    onSaveBillingSettings: (settings: BillingSettings) => Promise<void>;
    securitySettings: SecuritySettings;
    onSaveSecuritySettings: (settings: SecuritySettings) => Promise<void>;
    onBackToDashboard: () => void;
    onNavigateToAICard?: () => void;
    isDemoMode?: boolean;
    isBlueprintMode?: boolean;
    initialTab?: 'profile' | 'notifications' | 'security' | 'billing';
}

const SettingsPage: React.FC<SettingsPageProps> = ({
    userProfile,
    profileLoadFailed = false,
    onSaveProfile,
    notificationSettings,
    onSaveNotifications,
    billingSettings,
    onSaveBillingSettings,
    securitySettings,
    onSaveSecuritySettings,
    onBackToDashboard,
    onNavigateToAICard,
    userId,
    isDemoMode = false,
    isBlueprintMode,
    initialTab = 'profile'
}) => {
    const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security' | 'billing'>(initialTab);

    React.useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    const tabs = [
        { id: 'profile', label: 'Profile', icon: 'person' },
        { id: 'notifications', label: 'Notifications', icon: 'notifications' },
        { id: 'security', label: 'Security', icon: 'security' },
        { id: 'billing', label: 'Billing', icon: 'receipt_long' },
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
            {/* Sidebar */}
            <div className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col flex-shrink-0 h-screen sticky top-0">
                <div className="p-6">
                    <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary-600">settings</span>
                        Settings
                    </h1>
                </div>
                <nav className="px-4 space-y-1 flex-1 overflow-y-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as 'profile' | 'notifications' | 'security' | 'billing')}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === tab.id
                                ? 'bg-primary-50 text-primary-700'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                        >
                            <span className={`material-symbols-outlined w-5 h-5 ${activeTab === tab.id ? 'text-primary-600' : 'text-slate-400'}`}>
                                {tab.icon}
                            </span>
                            {tab.label}
                        </button>
                    ))}
                </nav>
                <div className="p-4 border-t border-slate-200 hidden">
                    {/* Back button removed per user request */}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto h-screen bg-slate-50">
                <div className="max-w-4xl mx-auto w-full">
                    {/* Mobile Header */}
                    <div className="md:hidden bg-white border-b border-slate-200 p-4 sticky top-0 z-10">
                        <div className="flex items-center justify-between mb-4">
                            <h1 className="text-lg font-bold text-slate-800">Settings</h1>
                            <button onClick={onBackToDashboard} className="p-2 text-slate-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as 'profile' | 'notifications' | 'security' | 'billing')}
                                    className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap ${activeTab === tab.id
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-slate-100 text-slate-600'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pb-20 md:pb-0">
                        {profileLoadFailed && (
                            <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3">
                                <p className="text-sm text-slate-700">Profile will appear after you add your details.</p>
                            </div>
                        )}
                        {isDemoMode && (
                            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-amber-600 flex-shrink-0">info</span>
                                    <div>
                                        <h4 className="font-semibold text-amber-900 mb-1">Demo Mode - Settings Are View-Only</h4>
                                        <p className="text-sm text-amber-700">You're viewing demo settings. Changes won't be saved in demo mode.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'profile' && (
                            <ProfileSettings
                                userProfile={userProfile}
                                onSave={isDemoMode ? async () => { } : onSaveProfile}
                                onBack={onBackToDashboard}
                                onNavigateToAICard={onNavigateToAICard}
                            />
                        )}
                        {activeTab === 'notifications' && (
                            <NotificationSettingsPage
                                settings={notificationSettings}
                                onSave={isDemoMode ? async () => { } : onSaveNotifications}
                                onBack={onBackToDashboard}
                                userProfile={userProfile}
                                onSaveProfile={isDemoMode ? async () => { } : onSaveProfile}
                            />
                        )}
                        {activeTab === 'security' && (
                            <SecuritySettingsPage
                                settings={securitySettings}
                                onSaveSettings={isDemoMode ? async () => { } : onSaveSecuritySettings}
                                onBack={onBackToDashboard}
                            />
                        )}
                        {activeTab === 'billing' && (
                            <BillingSettingsPage
                                settings={billingSettings}
                                onSave={isDemoMode ? async () => { } : onSaveBillingSettings}
                                onBack={onBackToDashboard}
                                isBlueprintMode={isBlueprintMode}
                                agentProfile={userProfile}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
