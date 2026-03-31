import React, { useState } from 'react';
import { AgentProfile, NotificationSettings, BillingSettings, SecuritySettings, EmailSettings, CalendarSettings } from '../types';
import ProfileSettings from './settings/ProfileSettings';
import NotificationSettingsPage from './settings/NotificationSettings';
import SecuritySettingsPage from './settings/SecuritySettings';
import BillingSettingsPage from './settings/BillingSettings';
import EmailSettingsPage from './settings/EmailSettings';
import CalendarSettingsPage from './settings/CalendarSettings';

interface SettingsPageProps {
    userId: string;
    userProfile: AgentProfile;
    profileLoadFailed?: boolean;
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
    isDemoMode?: boolean;
    isBlueprintMode?: boolean;
    initialTab?: 'profile' | 'notifications' | 'email' | 'calendar' | 'security' | 'billing';
}

const SettingsPage: React.FC<SettingsPageProps> = ({
    userProfile,
    profileLoadFailed = false,
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
    userId: _userId,
    isDemoMode = false,
    isBlueprintMode,
    initialTab = 'profile'
}) => {
    const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'email' | 'calendar' | 'security' | 'billing'>(initialTab);
    const [refreshingApp, setRefreshingApp] = useState(false);

    const hardRefreshApp = async () => {
        if (refreshingApp) return;
        setRefreshingApp(true);
        try {
            if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                await Promise.all(regs.map((reg) => reg.unregister()));
            }
            if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map((key) => caches.delete(key)));
            }
        } catch (_error) {
            // no-op
        } finally {
            window.location.reload();
        }
    };

    React.useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    const tabs = [
        { id: 'profile', label: 'Profile', icon: 'person' },
        { id: 'notifications', label: 'Notifications', icon: 'notifications' },
        { id: 'email', label: 'Email', icon: 'mail' },
        { id: 'calendar', label: 'Calendar', icon: 'calendar_month' },
        { id: 'security', label: 'Security', icon: 'security' },
        { id: 'billing', label: 'Billing', icon: 'receipt_long' },
    ];

    const demoShowroomLinks = [
        { label: 'Open Demo Gallery', href: '/demo-dashboard/gallery/demo-listing-oak', tone: 'dark' as const },
        { label: 'Open Demo CRM', href: '/demo-dashboard/listings/demo-listing-oak', tone: 'light' as const },
        { label: 'Open Demo Live Listing', href: '/demo-live/demo-124-oak-street-austin', tone: 'light' as const }
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
                        {profileLoadFailed && (
                            <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3">
                                <p className="text-sm text-slate-700">Profile will appear after you add your details.</p>
                            </div>
                        )}
                        {isDemoMode && (
                            <div className="mb-6 space-y-5">
                                <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_34%),linear-gradient(135deg,#0f172a_0%,#111827_55%,#1e293b_100%)] p-6 text-white shadow-sm">
                                    <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                                        <div className="max-w-2xl">
                                            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-300">Settings Showroom</p>
                                            <h2 className="mt-3 text-4xl font-black tracking-tight">This is the part that makes the app feel expensive.</h2>
                                            <p className="mt-3 text-sm leading-6 text-slate-300">
                                                Show branding, notifications, security, and billing in one premium walkthrough. This is the “Lamborghini, not Toyota” proof that the platform is complete, not just pretty.
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-3">
                                            {demoShowroomLinks.map((link) => (
                                                <a
                                                    key={link.href}
                                                    href={link.href}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className={link.tone === 'dark'
                                                        ? 'rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-slate-100'
                                                        : 'rounded-2xl border border-slate-600 bg-slate-900/30 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-900/60'}
                                                >
                                                    {link.label}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                </section>

                                <section className="grid gap-4 lg:grid-cols-3">
                                    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                        <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Branding / AI Card</div>
                                        <h3 className="mt-3 text-xl font-black text-slate-950">Every listing looks like one brand.</h3>
                                        <p className="mt-2 text-sm leading-6 text-slate-600">Show the business card, logo or headshot, color system, and the same identity flowing into reports, flyers, and video.</p>
                                    </article>
                                    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                        <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Notifications + Calls</div>
                                        <h3 className="mt-3 text-xl font-black text-slate-950">The agent does not miss the handoff.</h3>
                                        <p className="mt-2 text-sm leading-6 text-slate-600">Show alert preferences and reminder setup. The point is simple: leads come in, reminders happen, and showings do not die in the cracks.</p>
                                    </article>
                                    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                        <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Billing + Control</div>
                                        <h3 className="mt-3 text-xl font-black text-slate-950">This is a platform, not a one-off tool.</h3>
                                        <p className="mt-2 text-sm leading-6 text-slate-600">Show that the product has real plan structure, real controls, and a real settings system behind the listing conversion story.</p>
                                    </article>
                                </section>

                                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                                    <div className="flex items-start gap-3">
                                        <span className="material-symbols-outlined text-amber-600 flex-shrink-0">info</span>
                                        <div>
                                            <h4 className="font-semibold text-amber-900 mb-1">Demo Mode - Settings Are View-Only</h4>
                                            <p className="text-sm text-amber-700">This is the polished demo version. It is here to show the system, not save live account changes.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'profile' && (
                            <ProfileSettings
                                userProfile={userProfile}
                                onSave={isDemoMode ? async () => { } : onSaveProfile}
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
                        {activeTab === 'email' && (
                            <EmailSettingsPage
                                settings={emailSettings}
                                onSave={isDemoMode ? async () => { } : onSaveEmailSettings}
                                agentSlug={userProfile.slug}
                            />
                        )}
                        {activeTab === 'calendar' && (
                            <CalendarSettingsPage
                                settings={calendarSettings}
                                onSave={isDemoMode ? async () => { } : onSaveCalendarSettings}
                                onBack={onBackToDashboard}
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
                        <div className="mt-6 flex justify-end px-2 pb-4">
                            <button
                                type="button"
                                onClick={() => void hardRefreshApp()}
                                disabled={refreshingApp}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {refreshingApp ? 'Refreshing…' : 'Refresh app'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
