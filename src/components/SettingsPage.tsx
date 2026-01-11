import React, { useState } from 'react';
import { AgentProfile, NotificationSettings, EmailSettings, CalendarSettings, BillingSettings, SecuritySettings } from '../types';
import ProfileSettings from './settings/ProfileSettings';
import NotificationSettingsPage from './settings/NotificationSettings';
import EmailSettingsPage from './settings/EmailSettings';
import CalendarSettingsPage from './settings/CalendarSettings';
import SecuritySettingsPage from './settings/SecuritySettings';
import BillingSettingsPage from './settings/BillingSettings';

interface SettingsPageProps {
    userId: string;
    userProfile: AgentProfile;
    onSaveProfile: (profile: AgentProfile) => Promise<void>;
    notificationSettings: NotificationSettings;
    onSaveNotifications: (settings: NotificationSettings) => Promise<void>;
    emailSettings: EmailSettings;
    onSaveEmailSettings: (settings: EmailSettings) => Promise<void>;
    calendarSettings: CalendarSettings;
    onSaveCalendarSettings: (settings: CalendarSettings) => Promise<void>;
    billingSettings: BillingSettings;
    onSaveBillingSettings: (settings: BillingSettings) => Promise<void>;
    securitySettings: SecuritySettings;
    onSaveSecuritySettings: (settings: SecuritySettings) => Promise<void>;
    onBackToDashboard: () => void;
    onNavigateToAICard?: () => void;
    isDemoMode?: boolean;
}

const SettingsPage: React.FC<SettingsPageProps> = ({
    userProfile,
    onSaveProfile,
    notificationSettings,
    onSaveNotifications,
    emailSettings,
    onSaveEmailSettings,
    calendarSettings,
    onSaveCalendarSettings,
    billingSettings,
    onSaveBillingSettings,
    securitySettings,
    onSaveSecuritySettings,
    onBackToDashboard,
    onNavigateToAICard,
    userId
}) => {
    const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'email' | 'calendar' | 'security' | 'billing'>('profile');

    const tabs = [
        { id: 'profile', label: 'Profile', icon: 'person' },
        { id: 'notifications', label: 'Notifications', icon: 'notifications' },
        { id: 'email', label: 'Email Integration', icon: 'mail' },
        { id: 'calendar', label: 'Calendar', icon: 'calendar_month' },
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
                            onClick={() => setActiveTab(tab.id as 'profile' | 'notifications' | 'email' | 'calendar' | 'security' | 'billing')}
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
                                    onClick={() => setActiveTab(tab.id as 'profile' | 'notifications' | 'email' | 'calendar' | 'security' | 'billing')}
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
                        {activeTab === 'profile' && (
                            <ProfileSettings
                                userProfile={userProfile}
                                onSave={onSaveProfile}
                                onBack={onBackToDashboard}
                                onNavigateToAICard={onNavigateToAICard}
                            />
                        )}
                        {activeTab === 'notifications' && (
                            <NotificationSettingsPage
                                settings={notificationSettings}
                                onSave={onSaveNotifications}
                                onBack={onBackToDashboard}
                            />
                        )}
                        {activeTab === 'email' && (
                            <EmailSettingsPage
                                settings={emailSettings}
                                onSave={onSaveEmailSettings}
                                onBack={onBackToDashboard}
                                agentSlug={userProfile.slug || userId}
                            />
                        )}
                        {activeTab === 'calendar' && (
                            <CalendarSettingsPage
                                settings={calendarSettings}
                                onSave={onSaveCalendarSettings}
                                onBack={onBackToDashboard}
                            />
                        )}
                        {activeTab === 'security' && (
                            <SecuritySettingsPage
                                settings={securitySettings}
                                onSaveSettings={onSaveSecuritySettings}
                                onBack={onBackToDashboard}
                            />
                        )}
                        {activeTab === 'billing' && (
                            <BillingSettingsPage
                                settings={billingSettings}
                                onSave={onSaveBillingSettings}
                                onBack={onBackToDashboard}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
