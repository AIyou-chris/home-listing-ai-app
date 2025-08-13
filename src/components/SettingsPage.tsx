import React, { useState, useEffect } from 'react';
import { AgentProfile, NotificationSettings, EmailSettings, CalendarSettings, BillingSettings } from '../types';

interface SettingsPageProps {
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
            className={`flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
                isActive
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

const FormTextarea: React.FC<{ label: string; id: string; } & React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ label, id, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
            {label}
        </label>
        <textarea
            id={id}
            {...props}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition"
        />
    </div>
);

const ToggleSwitch: React.FC<{
    enabled: boolean;
    onChange: (enabled: boolean) => void;
}> = ({ enabled, onChange }) => {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => onChange(!enabled)}
            className={`relative inline-flex flex-shrink-0 items-center h-6 rounded-full w-11 cursor-pointer transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                enabled ? 'bg-primary-600' : 'bg-slate-300'
            }`}
        >
            <span
                aria-hidden="true"
                className={`inline-block w-4 h-4 transform bg-white rounded-full shadow-lg ring-0 transition-transform duration-200 ease-in-out ${
                    enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
        </button>
    );
};

const NotificationPreferenceRow: React.FC<{
    label: string;
    description: string;
    enabled: boolean;
    onToggle: (enabled: boolean) => void;
}> = ({ label, description, enabled, onToggle }) => (
    <div className="flex justify-between items-center py-5">
        <div>
            <h4 className="font-semibold text-slate-800">{label}</h4>
            <p className="text-sm text-slate-500">{description}</p>
        </div>
        <ToggleSwitch enabled={enabled} onChange={onToggle} />
    </div>
);

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
            className={`p-5 text-left rounded-xl border-2 transition-all w-full h-full flex flex-col ${isSelected ? 'border-primary-500 bg-primary-50 shadow-lg' : 'border-slate-200 bg-white hover:border-primary-300 hover:shadow-md'}`}
        >
            <div className="flex items-center gap-4 mb-3">
                <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${isSelected ? 'bg-primary-500' : 'bg-slate-100'}`}>
                    <span className={`material-symbols-outlined w-6 h-6 ${isSelected ? 'text-white' : 'text-slate-600'}`}>{icon}</span>
                </div>
                <h4 className="text-lg font-bold text-slate-800">{title}</h4>
            </div>
            <p className="text-sm text-slate-600 flex-grow">{description}</p>
            <div className="mt-4 flex items-center gap-2">
                {tags.map(tag => (
                    <span key={tag.label} className={`px-2 py-0.5 text-xs font-semibold rounded-full ${tagColors[tag.color]}`}>
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
}> = ({ label, description, enabled, onToggle }) => (
    <div className="flex justify-between items-center p-4 bg-slate-50/70 rounded-lg border border-slate-200">
        <div>
            <h4 className="font-semibold text-slate-800">{label}</h4>
            <p className="text-sm text-slate-500">{description}</p>
        </div>
        <ToggleSwitch enabled={enabled} onChange={onToggle} />
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

const PlanFeature: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <li className="flex items-start gap-3">
        <span className="material-symbols-outlined w-6 h-6 text-green-500 flex-shrink-0 mt-0.5">check_circle</span>
        <span className="text-slate-600">{children}</span>
    </li>
);


const SettingsPage: React.FC<SettingsPageProps> = ({ userProfile, onSaveProfile, notificationSettings, onSaveNotifications, emailSettings, onSaveEmailSettings, calendarSettings, onSaveCalendarSettings, billingSettings, onSaveBillingSettings, onBackToDashboard }) => {
    const [activeTab, setActiveTab] = useState('billing');
    const [profileFormData, setProfileFormData] = useState<AgentProfile>(userProfile);
    const [emailFormData, setEmailFormData] = useState<EmailSettings>(emailSettings);
    const [calendarFormData, setCalendarFormData] = useState<CalendarSettings>(calendarSettings);
    const [currentNotifications, setCurrentNotifications] = useState<NotificationSettings>(notificationSettings);
    const [passwords, setPasswords] = useState({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
    });


    useEffect(() => {
        setCurrentNotifications(notificationSettings);
    }, [notificationSettings]);
     useEffect(() => {
        setProfileFormData(userProfile);
    }, [userProfile]);

    const handleProfileInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setProfileFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleProfileSave = (e: React.FormEvent) => {
        e.preventDefault();
        onSaveProfile(profileFormData);
        alert('Profile saved!');
    };

    const handleNotificationToggle = (key: keyof NotificationSettings, value: boolean) => {
        const updatedSettings = { ...currentNotifications, [key]: value };
        setCurrentNotifications(updatedSettings);
        onSaveNotifications(updatedSettings); // Auto-save on toggle
    };

    const handleEmailSettingsChange = (field: keyof EmailSettings, value: any) => {
        setEmailFormData(prev => ({...prev, [field]: value}));
    }
    
    const handleEmailSettingsSave = (e: React.FormEvent) => {
        e.preventDefault();
        onSaveEmailSettings(emailFormData);
        alert('Email settings saved!');
    }
    
    const handleCalendarSettingsChange = (field: keyof CalendarSettings | 'integrationType', value: any) => {
        setCalendarFormData(prev => ({...prev, [field]: value}));
    }

    const handleCalendarSettingsSave = (e: React.FormEvent) => {
        e.preventDefault();
        onSaveCalendarSettings(calendarFormData);
        alert('Calendar settings saved!');
    }

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPasswords(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdatePassword = (e: React.FormEvent) => {
        e.preventDefault();
        if (passwords.newPassword !== passwords.confirmNewPassword) {
            alert("New passwords do not match.");
            return;
        }
        if (!passwords.newPassword) {
            alert("New password cannot be empty.");
            return;
        }
        alert("Password updated successfully! (mocked)");
        setPasswords({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    };
    
    const tabs = [
        { id: 'profile', label: 'Profile', icon: 'account_circle' },
        { id: 'notifications', label: 'Notifications', icon: 'notifications' },
        { id: 'email', label: 'Email', icon: 'mail' },
        { id: 'calendar', label: 'Calendar', icon: 'calendar_today' },
        { id: 'security', label: 'Security', icon: 'shield' },
        { id: 'billing', label: 'Billing', icon: 'credit_card' },
    ];

    const getStatusColor = (status: 'Paid' | 'Pending' | 'Failed') => {
      switch(status) {
        case 'Paid': return 'bg-green-100 text-green-700';
        case 'Pending': return 'bg-yellow-100 text-yellow-700';
        case 'Failed': return 'bg-red-100 text-red-700';
        default: return 'bg-slate-100 text-slate-700';
      }
    }


    return (
        <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
             <button onClick={onBackToDashboard} className="flex items-center space-x-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors mb-6">
                <span className="material-symbols-outlined w-5 h-5">chevron_left</span>
                <span>Back to Dashboard</span>
            </button>
            <div className="bg-white rounded-xl shadow-lg border border-slate-200/60">
                <div className="flex flex-col md:flex-row">
                    {/* Sidebar Navigation */}
                    <aside className="md:w-64 p-6 border-b md:border-b-0 md:border-r border-slate-200/80">
                         <h2 className="text-lg font-bold text-slate-800 mb-4">Settings</h2>
                        <nav className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-x-visible -mx-3 px-3 md:mx-0 md:px-0">
                            {tabs.map(tab => (
                                <TabButton
                                    key={tab.id}
                                    isActive={activeTab === tab.id}
                                    onClick={() => setActiveTab(tab.id)}
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
                           // Profile Content...
                           <div className="p-8">...</div>
                        )}
                        {activeTab === 'notifications' && (
                           // Notifications Content...
                           <div className="p-8">...</div>
                        )}
                         {activeTab === 'email' && (
                            <form onSubmit={handleEmailSettingsSave} className="p-8">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">Email Integration</h2>
                                    <p className="text-slate-500 mt-1">Choose how to connect your email for AI-powered lead management.</p>
                                </div>

                                <div className="mt-8 pt-8 border-t border-slate-200">
                                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Connection Method</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <IntegrationCard
                                            icon="mail"
                                            title="Email Forwarding"
                                            description="The easiest way to get started. Set up a simple forwarding rule in your email client."
                                            tags={[{ label: 'Easy Start', color: 'blue' }, { label: 'Good', color: 'green' }]}
                                            isSelected={emailFormData.integrationType === 'forwarding'}
                                            onClick={() => handleEmailSettingsChange('integrationType', 'forwarding')}
                                        />
                                        <IntegrationCard
                                            icon="shield"
                                            title="Direct Connection"
                                            description="Recommended for professionals. Connect your Google or Microsoft account for perfect authenticity."
                                            tags={[{ label: 'Recommended', color: 'purple' }, { label: 'Best', color: 'green' }]}
                                            isSelected={emailFormData.integrationType === 'oauth'}
                                            onClick={() => handleEmailSettingsChange('integrationType', 'oauth')}
                                        />
                                    </div>
                                </div>
                                
                                {emailFormData.integrationType === 'forwarding' && (
                                    <div className="mt-8 pt-8 border-t border-slate-200">
                                        <h3 className="text-xl font-bold text-slate-800 mb-4">Email Forwarding Setup</h3>
                                        <div className="p-6 bg-slate-50 rounded-lg border border-slate-200 space-y-4">
                                            <div>
                                                <h4 className="font-semibold text-slate-700">How it Works</h4>
                                                <p className="text-sm text-slate-600 mt-1">Simply set up a rule in your email client (like Gmail or Outlook) to automatically forward new lead emails to the unique address below. Our AI will then process them for you.</p>
                                            </div>
                                            <div>
                                                <label htmlFor="forwardingAddress" className="block text-sm font-semibold text-slate-700 mb-1.5">Your Unique Forwarding Address</label>
                                                <input id="forwardingAddress" type="text" readOnly value={`agent-${userProfile.email?.split('@')[0] || '123'}@homelistingai.com`} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-slate-700">How it Looks to Clients</h4>
                                                <p className="text-sm text-slate-600 mt-1">When we send emails on your behalf, some email clients may show a "via homelistingai.com" notice.</p>
                                                <div className="mt-2 p-3 bg-white border border-slate-200 rounded-md text-sm">
                                                    <p><strong>From:</strong> {userProfile.name} &lt;{userProfile.email}&gt;</p>
                                                    <p className="text-xs text-slate-500">via homelistingai.com</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {emailFormData.integrationType === 'oauth' && (
                                    <div className="mt-8 pt-8 border-t border-slate-200">
                                        <h3 className="text-xl font-bold text-slate-800 mb-4">Direct Account Connection</h3>
                                        <div className="p-6 bg-slate-50 rounded-lg border border-slate-200 space-y-4">
                                             <div>
                                                <h4 className="font-semibold text-slate-700">How it Works</h4>
                                                <p className="text-sm text-slate-600 mt-1">Connect your email account securely using OAuth. We never see or store your password. This sends emails directly from your account, ensuring perfect deliverability and professionalism.</p>
                                            </div>
                                             <div>
                                                <h4 className="font-semibold text-slate-700">How it Looks to Clients</h4>
                                                <p className="text-sm text-slate-600 mt-1">Emails appear exactly as if you sent them yourself. No "via" tags, no branding from us.</p>
                                                <div className="mt-2 p-3 bg-white border border-slate-200 rounded-md text-sm">
                                                    <p><strong>From:</strong> {userProfile.name} &lt;{userProfile.email}&gt;</p>
                                                    <p className="text-xs text-green-600">✓ Looks 100% authentic</p>
                                                </div>
                                            </div>
                                            <div className="pt-4 flex flex-col sm:flex-row gap-4">
                                                 <button type="button" className="flex-1 flex items-center justify-center gap-3 px-4 py-3 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition">
                                                    <span className="material-symbols-outlined w-6 h-6">google</span>
                                                    <span className="font-semibold text-slate-700">Connect with Google</span>
                                                 </button>
                                                  <button type="button" className="flex-1 flex items-center justify-center gap-3 px-4 py-3 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition">
                                                    <span className="material-symbols-outlined w-6 h-6">microsoft</span>
                                                    <span className="font-semibold text-slate-700">Connect with Microsoft</span>
                                                 </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <FeatureSection title="AI Email Features" icon="sparkles">
                                    <FeatureToggleRow
                                        label="AI Email Processing"
                                        description="Let the AI read, categorize, and summarize incoming emails."
                                        enabled={emailFormData.aiEmailProcessing}
                                        onToggle={(val) => handleEmailSettingsChange('aiEmailProcessing', val)}
                                    />
                                    <FeatureToggleRow
                                        label="Smart Auto-Reply"
                                        description="Automatically send AI-generated replies to common inquiries."
                                        enabled={emailFormData.autoReply}
                                        onToggle={(val) => handleEmailSettingsChange('autoReply', val)}
                                    />
                                    <FeatureToggleRow
                                        label="AI Lead Scoring"
                                        description="Prioritize hot leads by analyzing email content and intent."
                                        enabled={emailFormData.leadScoring}
                                        onToggle={(val) => handleEmailSettingsChange('leadScoring', val)}
                                    />
                                    <FeatureToggleRow
                                        label="Automated Follow-up Enrollment"
                                        description="Automatically enroll new leads into your follow-up sequences."
                                        enabled={emailFormData.followUpSequences}
                                        onToggle={(val) => handleEmailSettingsChange('followUpSequences', val)}
                                    />
                                </FeatureSection>

                                <div className="mt-8 pt-5 border-t border-slate-200 flex justify-end">
                                    <button type="submit" className="px-6 py-2.5 font-semibold text-white bg-primary-600 rounded-lg shadow-sm hover:bg-primary-700 transition">
                                        Save Email Settings
                                    </button>
                                </div>
                            </form>
                        )}
                        {activeTab === 'calendar' && (
                            <form onSubmit={handleCalendarSettingsSave} className="p-8">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">Calendar Integration</h2>
                                    <p className="text-slate-500 mt-1">Connect your calendar to sync appointments and automate scheduling.</p>
                                </div>
                                 <div className="mt-8 pt-8 border-t border-slate-200">
                                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Choose Calendar Service</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <IntegrationCard
                                            icon="calendar_month"
                                            title="Google Calendar"
                                            description="Sync with your Google account for seamless scheduling."
                                            tags={[{ label: 'Popular', color: 'blue' }]}
                                            isSelected={calendarFormData.integrationType === 'google'}
                                            onClick={() => handleCalendarSettingsChange('integrationType', 'google')}
                                        />
                                        <IntegrationCard
                                            icon="calendar_month"
                                            title="Outlook Calendar"
                                            description="Connect your Microsoft 365 or Outlook calendar."
                                            tags={[{ label: 'Microsoft', color: 'purple' }]}
                                            isSelected={calendarFormData.integrationType === 'outlook'}
                                            onClick={() => handleCalendarSettingsChange('integrationType', 'outlook')}
                                        />
                                         <IntegrationCard
                                            icon="apple"
                                            title="Apple Calendar"
                                            description="Integrate with your iCloud Calendar."
                                            tags={[{ label: 'Apple', color: 'green' }]}
                                            isSelected={calendarFormData.integrationType === 'apple'}
                                            onClick={() => handleCalendarSettingsChange('integrationType', 'apple')}
                                        />
                                    </div>
                                </div>
                                {calendarFormData.integrationType && (
                                    <div className="mt-8 pt-8 border-t border-slate-200">
                                         <h3 className="text-xl font-bold text-slate-800 mb-4 capitalize">{calendarFormData.integrationType} Calendar Setup</h3>
                                         <div className="p-6 bg-slate-50 rounded-lg border border-slate-200 space-y-4">
                                            <div>
                                                <h4 className="font-semibold text-slate-700">How it Works</h4>
                                                <p className="text-sm text-slate-600 mt-1">Connecting your calendar allows our AI to check your real-time availability, schedule showings, and add appointments directly to your calendar, preventing double-bookings.</p>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-slate-700">Example Event</h4>
                                                <div className="mt-2 p-3 bg-white border border-slate-200 rounded-md text-sm">
                                                    <p className="font-bold text-primary-700">Showing: 123 Oak St w/ John Doe</p>
                                                    <p className="text-slate-500">Tuesday, August 12, 2:00 PM - 2:30 PM</p>
                                                </div>
                                            </div>
                                             <div className="pt-4">
                                                 <button type="button" className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-3 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition">
                                                    <span className="font-semibold text-slate-700">Connect with {calendarFormData.integrationType.charAt(0).toUpperCase() + calendarFormData.integrationType.slice(1)}</span>
                                                 </button>
                                             </div>
                                         </div>
                                    </div>
                                )}
                                <FeatureSection title="AI Scheduling Features" icon="sparkles">
                                    <FeatureToggleRow label="AI Scheduling" description="Let the AI assistant find optimal times and book appointments directly." enabled={calendarFormData.aiScheduling} onToggle={(val) => handleCalendarSettingsChange('aiScheduling', val)} />
                                    <FeatureToggleRow label="Conflict Detection" description="Prevent double-bookings by checking real-time availability." enabled={calendarFormData.conflictDetection} onToggle={(val) => handleCalendarSettingsChange('conflictDetection', val)} />
                                    <FeatureToggleRow label="Automatic Email Reminders" description="Send automated reminders to clients before an appointment." enabled={calendarFormData.emailReminders} onToggle={(val) => handleCalendarSettingsChange('emailReminders', val)} />
                                    <FeatureToggleRow label="Auto-Confirm Appointments" description="Automatically confirm appointments without manual approval." enabled={calendarFormData.autoConfirm} onToggle={(val) => handleCalendarSettingsChange('autoConfirm', val)} />
                                </FeatureSection>
                                <div className="mt-8 pt-5 border-t border-slate-200 flex justify-end">
                                    <button type="submit" className="px-6 py-2.5 font-semibold text-white bg-primary-600 rounded-lg shadow-sm hover:bg-primary-700 transition">
                                        Save Calendar Settings
                                    </button>
                                </div>
                            </form>
                        )}
                        {activeTab === 'security' && (
                           <div className="p-8">
                                <h2 className="text-2xl font-bold text-slate-900">Security Settings</h2>
                                <p className="text-slate-500 mt-1">Manage your account security and privacy settings</p>

                                {/* Change Password */}
                                <div className="mt-8 pt-8 border-t border-slate-200">
                                    <h3 className="text-lg font-bold text-slate-800">Change Password</h3>
                                    <form onSubmit={handleUpdatePassword} className="mt-4 space-y-4 max-w-md">
                                        <FormInput 
                                            label="Current Password" 
                                            id="currentPassword" 
                                            name="currentPassword"
                                            type="password" 
                                            value={passwords.currentPassword} 
                                            onChange={handlePasswordChange}
                                        />
                                        <FormInput 
                                            label="New Password" 
                                            id="newPassword" 
                                            name="newPassword"
                                            type="password" 
                                            value={passwords.newPassword} 
                                            onChange={handlePasswordChange}
                                        />
                                        <FormInput 
                                            label="Confirm New Password" 
                                            id="confirmNewPassword" 
                                            name="confirmNewPassword"
                                            type="password" 
                                            value={passwords.confirmNewPassword} 
                                            onChange={handlePasswordChange}
                                        />
                                        <div>
                                            <button type="submit" className="px-5 py-2 font-semibold text-white bg-primary-600 rounded-lg shadow-sm hover:bg-primary-700 transition">
                                                Update Password
                                            </button>
                                        </div>
                                    </form>
                                </div>
                           </div>
                        )}
                        {activeTab === 'billing' && (
                           <div className="p-8">
                                <header className="mb-8">
                                    <h2 className="text-2xl font-bold text-slate-900">Billing & Plans</h2>
                                    <p className="text-slate-500 mt-1">Manage your subscription, view invoices, and change your plan.</p>
                                </header>
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                                    {/* Solo Agent Plan */}
                                    <div className={`p-8 rounded-2xl shadow-lg border-2 ${billingSettings.planName === 'Solo Agent' ? 'border-primary-500 bg-primary-50' : 'bg-white border-slate-200'}`}>
                                        <h3 className="text-xl font-bold text-slate-800">Solo Agent</h3>
                                        <p className="mt-2 text-slate-500 h-12">For the individual agent ready to supercharge their business.</p>
                                        <p className="mt-6">
                                            <span className="text-5xl font-extrabold text-slate-900">$59</span>
                                            <span className="text-xl font-medium text-slate-500">/mo</span>
                                        </p>
                                        <p className="mt-1 text-sm text-slate-500">Up to 5 Active Listings</p>
                                        <button
                                            disabled={billingSettings.planName === 'Solo Agent'}
                                            className="w-full mt-8 py-3 px-6 text-lg font-bold rounded-lg transition-colors duration-300 bg-primary-600 text-white shadow-md hover:bg-primary-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
                                        >
                                            {billingSettings.planName === 'Solo Agent' ? 'Current Plan' : 'Choose Plan'}
                                        </button>
                                        <ul className="mt-8 space-y-4">
                                            <PlanFeature>Full Dashboard Access</PlanFeature>
                                            <PlanFeature>AI Content Studio</PlanFeature>
                                            <PlanFeature>Automated Follow-up Sequences</PlanFeature>
                                            <PlanFeature>AI Inbox & Lead Management</PlanFeature>
                                            <PlanFeature>Standard Support</PlanFeature>
                                        </ul>
                                    </div>

                                    {/* Pro Team Plan */}
                                    <div className={`p-8 rounded-2xl shadow-2xl border-2 relative bg-white border-slate-200`}>
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                            <span className="px-4 py-1 bg-purple-600 text-white text-xs font-bold uppercase rounded-full">Most Popular</span>
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-800">Pro Team</h3>
                                        <p className="mt-2 text-slate-500 h-12">For small teams and top producers who need more power.</p>
                                        <p className="mt-6">
                                            <span className="text-5xl font-extrabold text-slate-900">$149</span>
                                            <span className="text-xl font-medium text-slate-500">/mo</span>
                                        </p>
                                        <p className="mt-1 text-sm text-slate-500">Up to 20 Active Listings & 3 Agent Seats</p>
                                        <button className="w-full mt-8 py-3 px-6 text-lg font-bold rounded-lg transition-colors duration-300 bg-purple-600 text-white shadow-md hover:bg-purple-700">
                                            Upgrade Plan
                                        </button>
                                        <ul className="mt-8 space-y-4">
                                            <PlanFeature>Everything in Solo Agent</PlanFeature>
                                            <PlanFeature>Team Collaboration Features</PlanFeature>
                                            <PlanFeature>Advanced Analytics</PlanFeature>
                                            <PlanFeature>Priority Email Support</PlanFeature>
                                        </ul>
                                    </div>

                                    {/* Brokerage Plan */}
                                    <div className={`p-8 rounded-2xl shadow-lg border-2 bg-white border-slate-200`}>
                                        <h3 className="text-xl font-bold text-slate-800">Brokerage</h3>
                                        <p className="mt-2 text-slate-500 h-12">Fully branded solutions for your entire brokerage.</p>
                                        <p className="mt-6">
                                            <span className="text-4xl font-extrabold text-slate-900">Custom</span>
                                        </p>
                                        <p className="mt-1 text-sm text-slate-500">Unlimited Listings & Agents</p>
                                        <button className="w-full mt-8 py-3 px-6 text-lg font-bold rounded-lg transition-colors duration-300 bg-slate-800 text-white shadow-md hover:bg-slate-900">
                                            Contact Us
                                        </button>
                                        <ul className="mt-8 space-y-4">
                                            <PlanFeature>Everything in Pro Team</PlanFeature>
                                            <PlanFeature>Full White-Labeling</PlanFeature>
                                            <PlanFeature>Custom Integrations</PlanFeature>
                                            <PlanFeature>Dedicated Account Manager</PlanFeature>
                                        </ul>
                                    </div>
                                </div>
                                <div className="mt-12 pt-8 border-t border-slate-200">
                                    <h3 className="text-lg font-bold text-slate-800 mb-4">Billing History</h3>
                                     <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="text-left text-slate-500">
                                                <tr className="border-b border-slate-200">
                                                    <th className="font-semibold p-3">Invoice ID</th>
                                                    <th className="font-semibold p-3">Date</th>
                                                    <th className="font-semibold p-3">Amount</th>
                                                    <th className="font-semibold p-3">Status</th>
                                                    <th className="font-semibold p-3"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {billingSettings.history.map(invoice => (
                                                    <tr key={invoice.id}>
                                                        <td className="p-3 font-medium text-slate-700">{invoice.id}</td>
                                                        <td className="p-3 text-slate-600">{invoice.date}</td>
                                                        <td className="p-3 text-slate-600">${invoice.amount.toFixed(2)}</td>
                                                        <td className="p-3">
                                                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>{invoice.status}</span>
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <button className="flex items-center gap-1 font-semibold text-primary-600 hover:text-primary-800">
                                                                <span className="material-symbols-outlined w-4 h-4">download</span>
                                                                <span>PDF</span>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                           </div>
                        )}
                        {activeTab !== 'profile' && activeTab !== 'notifications' && activeTab !== 'email' && activeTab !== 'calendar' && activeTab !== 'security' && activeTab !== 'billing' && (
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
