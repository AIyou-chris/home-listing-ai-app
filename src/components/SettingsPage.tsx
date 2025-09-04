import React, { useState, useEffect } from 'react';
import { AgentProfile, NotificationSettings, EmailSettings, CalendarSettings, BillingSettings } from '../types';
import { emailAuthService, EmailConnection } from '../services/emailAuthService';
import NotificationService from '../services/notificationService';

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
            className={`p-4 sm:p-5 text-left rounded-xl border-2 transition-all w-full h-full flex flex-col min-h-[140px] sm:min-h-[160px] ${
                isSelected 
                    ? 'border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-200' 
                    : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md hover:bg-slate-50 active:bg-slate-100'
            }`}
        >
            <div className="flex items-center gap-3 sm:gap-4 mb-3">
                <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center ${
                    isSelected ? 'bg-blue-500' : 'bg-slate-100'
                }`}>
                    <span className={`material-symbols-outlined w-5 h-5 sm:w-6 sm:h-6 ${
                        isSelected ? 'text-white' : 'text-slate-600'
                    }`}>{icon}</span>
                </div>
                <h4 className="text-base sm:text-lg font-bold text-slate-800">{title}</h4>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 flex-grow leading-relaxed">{description}</p>
            <div className="mt-3 sm:mt-4 flex items-center gap-2 flex-wrap">
                {tags.map(tag => (
                    <span key={tag.label} className={`px-2 py-1 text-xs font-semibold rounded-full ${tagColors[tag.color]}`}>
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
    const [activeTab, setActiveTab] = useState<'notifications' | 'email' | 'calendar' | 'security' | 'billing'>('notifications');
    const [emailFormData, setEmailFormData] = useState<EmailSettings>(emailSettings);
    const [calendarFormData, setCalendarFormData] = useState<CalendarSettings>(calendarSettings);
    const [currentNotifications, setCurrentNotifications] = useState<NotificationSettings>(notificationSettings);
    const [passwords, setPasswords] = useState({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
    });
    
    // Email connection state
    const [emailConnections, setEmailConnections] = useState<EmailConnection[]>([]);
    const [isConnecting, setIsConnecting] = useState<string | null>(null);
    
    // Calendar connection state
    const [isGoogleCalendarConnected, setIsGoogleCalendarConnected] = useState(false);
    
    // Security settings state
    const [securitySettings, setSecuritySettings] = useState({
        loginNotifications: true,
        sessionTimeout: 24,
        analyticsEnabled: true
    });
    
    // Notification permission state
    const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
    const [isRequestingPermission, setIsRequestingPermission] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);


    useEffect(() => {
        setCurrentNotifications(notificationSettings);
        // Load existing email connections
        setEmailConnections(emailAuthService.getConnections());
        // Check notification permission
        if ('Notification' in window) {
            setNotificationPermission(Notification.permission);
        }
        // Check Google Calendar connection status
        import('../services/googleOAuthService').then(({ googleOAuthService }) => {
            setIsGoogleCalendarConnected(googleOAuthService.isAuthenticated());
        });
    }, [notificationSettings]);

    // Email connection handlers
    const handleGmailConnect = async () => {
        setIsConnecting('gmail');
        try {
            const connection = await emailAuthService.connectGmail();
            setEmailConnections(prev => [...prev.filter(c => c.provider !== 'gmail'), connection]);
        } catch (error) {
            console.error('Gmail connection failed:', error);
            alert('Failed to connect Gmail. Please try again.');
        } finally {
            setIsConnecting(null);
        }
    };

    const handleOutlookConnect = async () => {
        setIsConnecting('outlook');
        try {
            const connection = await emailAuthService.connectOutlook();
            setEmailConnections(prev => [...prev.filter(c => c.provider !== 'outlook'), connection]);
        } catch (error) {
            console.error('Outlook connection failed:', error);
            alert('Failed to connect Outlook. Please try again.');
        } finally {
            setIsConnecting(null);
        }
    };

    const handleEmailDisconnect = async (provider: 'gmail' | 'outlook') => {
        try {
            await emailAuthService.disconnect(provider);
            setEmailConnections(prev => prev.filter(c => c.provider !== provider));
        } catch (error) {
            console.error('Disconnect failed:', error);
        }
    };

    // Calendar connection handlers
    const handleGoogleCalendarConnect = async () => {
        setIsConnecting('google');
        try {
            const { googleOAuthService } = await import('../services/googleOAuthService');
            const success = await googleOAuthService.requestAccess();
            if (success) {
                setIsGoogleCalendarConnected(true);
                alert('Google Calendar connected successfully! Your consultations will now automatically sync to your calendar.');
            } else {
                alert('Failed to connect Google Calendar. Please try again.');
            }
        } catch (error) {
            console.error('Google Calendar connection failed:', error);
            alert('Failed to connect Google Calendar. Please try again.');
        } finally {
            setIsConnecting(null);
        }
    };

    const handleCalendarInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'startTime' || name === 'endTime') {
            setCalendarFormData(prev => ({
                ...prev,
                workingHours: {
                    ...prev.workingHours,
                    [name]: value
                }
            }));
        } else {
            setCalendarFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleWorkingDayToggle = (day: string, checked: boolean) => {
        setCalendarFormData(prev => {
            const workingDays = prev.workingDays || [];
            if (checked) {
                return {
                    ...prev,
                    workingDays: [...workingDays, day]
                };
            } else {
                return {
                    ...prev,
                    workingDays: workingDays.filter(d => d !== day)
                };
            }
        });
    };

    const handleCalendarToggle = (setting: keyof CalendarSettings, value: boolean) => {
        setCalendarFormData(prev => ({
            ...prev,
            [setting]: value
        }));
    };

    const handleCalendarSettingsSave = (e: React.FormEvent) => {
        e.preventDefault();
        onSaveCalendarSettings(calendarFormData);
        alert('Calendar settings saved successfully!');
    };

    // Security handlers
    const handlePasswordSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!isPasswordValid) {
            alert('Please check password requirements');
            return;
        }
        
        try {
            // Here you would integrate with your authentication service
            // For now, we'll simulate the password change
            console.log('Password change request:', {
                currentPassword: passwords.currentPassword,
                newPassword: passwords.newPassword
            });
            
            // Reset form
            setPasswords({
                currentPassword: '',
                newPassword: '',
                confirmNewPassword: ''
            });
            
            alert('Password updated successfully!');
        } catch (error) {
            console.error('Password update failed:', error);
            alert('Failed to update password. Please try again.');
        }
    };

    const handleSecurityToggle = (setting: string, value: boolean | number) => {
        setSecuritySettings(prev => ({
            ...prev,
            [setting]: value
        }));
    };

    const handleSecuritySettingsSave = () => {
        // Here you would save security settings to your backend
        console.log('Saving security settings:', securitySettings);
        alert('Security settings saved successfully!');
    };

    // Password validation
    const isPasswordValid = 
        passwords.newPassword.length >= 8 &&
        /[A-Z]/.test(passwords.newPassword) &&
        /[0-9]/.test(passwords.newPassword) &&
        /[^A-Za-z0-9]/.test(passwords.newPassword) &&
        passwords.newPassword === passwords.confirmNewPassword &&
        passwords.currentPassword.length > 0;

    // Billing handlers
    const handleAddPaymentMethod = () => {
        // Open PayPal payment method modal
        window.open('https://www.paypal.com/billing/subscriptions', '_blank');
        alert('PayPal payment setup opened in new tab');
    };

    const handleUpgradePlan = () => {
        // For now, show upgrade options
        alert('Plan upgrade options will be available soon! Contact support for custom plans.');
    };

    const handleUpdateBilling = () => {
        // Open PayPal billing management
        window.open('https://www.paypal.com/billing/subscriptions', '_blank');
        alert('PayPal billing management opened in new tab');
    };

    const handleCancelSubscription = () => {
        const confirmed = confirm('Are you sure you want to cancel your subscription? You will lose access to all AI features at the end of your current billing period.');
        if (confirmed) {
            // Here you would integrate with PayPal's subscription cancellation API
            console.log('Subscription cancellation requested');
            alert('Cancellation request submitted. You will receive a confirmation email shortly.');
        }
    };

    // Notification permission handlers
    const handleRequestNotificationPermission = async () => {
        setIsRequestingPermission(true);
        try {
            const permission = await Notification.requestPermission();
            setNotificationPermission(permission);
            if (permission === 'granted') {
                // Show test notification
                new Notification('Test Notification', {
                    body: 'This is a test notification from HomeListing AI',
                    icon: '/newlogo.png'
                });
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
        } finally {
            setIsRequestingPermission(false);
        }
    };

    const handleTestNotification = async () => {
        try {
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Test Notification', {
                    body: 'This is a test notification from HomeListing AI',
                    icon: '/newlogo.png'
                });
            } else {
                alert('Please enable browser notifications first!');
            }
        } catch (error) {
            console.error('Error showing test notification:', error);
        }
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
                                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                                    icon={tab.icon}
                                >
                                    {tab.label}
                                </TabButton>
                            ))}
                        </nav>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1">
                        {activeTab === 'notifications' && (
                            <div className="p-8 space-y-8">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">🔔 Notification Settings</h2>
                                    <p className="text-slate-500 mt-1">Customize how and when you receive notifications.</p>
                                </div>

                                {/* Email Notifications */}
                                <FeatureSection title="Email Notifications" icon="mail">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                            <div>
                                                <h4 className="font-medium text-slate-900">New Leads</h4>
                                                <p className="text-sm text-slate-500">Get notified when new leads are generated</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={currentNotifications.newLead}
                                                    onChange={(e) => handleNotificationToggle('newLead', e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                            </label>
                                        </div>
                                        
                                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                            <div>
                                                <h4 className="font-medium text-slate-900">Appointment Reminders</h4>
                                                <p className="text-sm text-slate-500">Receive reminders before scheduled appointments</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={currentNotifications.appointmentReminders}
                                                    onChange={(e) => handleNotificationToggle('appointmentReminders', e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                            </label>
                                        </div>
                                        
                                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                            <div>
                                                <h4 className="font-medium text-slate-900">Follow-up Tasks</h4>
                                                <p className="text-sm text-slate-500">Get notified about upcoming follow-up tasks</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={currentNotifications.taskReminders}
                                                    onChange={(e) => handleNotificationToggle('taskReminders', e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                            </label>
                                        </div>
                                        
                                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                            <div>
                                                <h4 className="font-medium text-slate-900">Marketing Updates</h4>
                                                <p className="text-sm text-slate-500">Updates about marketing campaigns and sequences</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={currentNotifications.marketingUpdates}
                                                    onChange={(e) => handleNotificationToggle('marketingUpdates', e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                            </label>
                                        </div>
                                        
                                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                            <div>
                                                <h4 className="font-medium text-slate-900">Property Inquiries</h4>
                                                <p className="text-sm text-slate-500">When someone inquires about your listings</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={currentNotifications.propertyInquiries || true}
                                                    onChange={(e) => handleNotificationToggle('propertyInquiries', e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                            </label>
                                        </div>
                                        
                                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                            <div>
                                                <h4 className="font-medium text-slate-900">Showing Confirmations</h4>
                                                <p className="text-sm text-slate-500">When clients confirm or cancel showings</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={currentNotifications.showingConfirmations || true}
                                                    onChange={(e) => handleNotificationToggle('showingConfirmations', e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                            </label>
                                        </div>
                                    </div>
                                </FeatureSection>

                                {/* Instant Alerts */}
                                <FeatureSection title="Instant Alerts" icon="notifications_active">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                                            <div>
                                                <h4 className="font-medium text-red-900">Hot Leads 🔥</h4>
                                                <p className="text-sm text-red-600">High-priority leads that need immediate attention</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={currentNotifications.hotLeads || true}
                                                    onChange={(e) => handleNotificationToggle('hotLeads', e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                            </label>
                                        </div>
                                        
                                        <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                                            <div>
                                                <h4 className="font-medium text-orange-900">Price Changes</h4>
                                                <p className="text-sm text-orange-600">When competitors change pricing in your area</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={currentNotifications.priceChanges || false}
                                                    onChange={(e) => handleNotificationToggle('priceChanges', e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                                            </label>
                                        </div>
                                        
                                        <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                                            <div>
                                                <h4 className="font-medium text-green-900">Contract Milestones</h4>
                                                <p className="text-sm text-green-600">Important contract deadlines and milestones</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={currentNotifications.contractMilestones || true}
                                                    onChange={(e) => handleNotificationToggle('contractMilestones', e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                            </label>
                                        </div>
                                    </div>
                                </FeatureSection>

                                {/* Browser Push Notifications */}
                                <FeatureSection title="Browser Push Notifications" icon="notifications_active">
                                    <div className="space-y-4">
                                        {/* Permission Status */}
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className="material-symbols-outlined w-5 h-5 text-blue-600">
                                                        {notificationPermission === 'granted' ? 'check_circle' : 
                                                         notificationPermission === 'denied' ? 'block' : 'help'}
                                                    </span>
                                                    <div>
                                                        <h4 className="font-medium text-blue-900">
                                                            {notificationPermission === 'granted' ? 'Notifications Enabled ✅' :
                                                             notificationPermission === 'denied' ? 'Notifications Blocked ❌' :
                                                             'Notifications Not Enabled'}
                                                        </h4>
                                                        <p className="text-sm text-blue-700">
                                                            {notificationPermission === 'granted' ? 'You\'ll receive browser notifications on desktop and mobile' :
                                                             notificationPermission === 'denied' ? 'Please enable notifications in your browser settings' :
                                                             'Click "Enable" to receive instant notifications'}
                                                        </p>
                                                    </div>
                                                </div>
                                                {notificationPermission !== 'granted' && (
                                                    <button
                                                        onClick={handleRequestNotificationPermission}
                                                        disabled={isRequestingPermission || notificationPermission === 'denied'}
                                                        className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        {isRequestingPermission ? 'Requesting...' : 'Enable'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Browser Notifications Toggle */}
                                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                            <div>
                                                <h4 className="font-medium text-slate-900">Browser Notifications 📱</h4>
                                                <p className="text-sm text-slate-500">Works on desktop, mobile, and inside your listing app</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={currentNotifications.browserNotifications && notificationPermission === 'granted'}
                                                    onChange={(e) => handleNotificationToggle('browserNotifications', e.target.checked)}
                                                    disabled={notificationPermission !== 'granted'}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 peer-disabled:opacity-50"></div>
                                            </label>
                                        </div>

                                        {/* Test Button */}
                                        {notificationPermission === 'granted' && (
                                            <div className="flex justify-center">
                                                <button
                                                    onClick={handleTestNotification}
                                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors"
                                                >
                                                    <span className="material-symbols-outlined w-4 h-4">notification_add</span>
                                                    Test Notification
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </FeatureSection>

                                {/* Coming Soon Features */}
                                <FeatureSection title="Advanced Notifications" icon="smartphone">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg opacity-60">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-medium text-slate-900">SMS Alerts 📱</h4>
                                                    <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">Coming Soon</span>
                                                </div>
                                                <p className="text-sm text-slate-500">Receive text messages for urgent matters</p>
                                            </div>
                                            <div className="w-11 h-6 bg-gray-200 rounded-full opacity-50">
                                                <div className="w-5 h-5 bg-white border border-gray-300 rounded-full mt-0.5 ml-0.5"></div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg opacity-60">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-medium text-slate-900">Native Mobile App 📲</h4>
                                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">Coming Soon</span>
                                                </div>
                                                <p className="text-sm text-slate-500">Push notifications in dedicated mobile app</p>
                                            </div>
                                            <div className="w-11 h-6 bg-gray-200 rounded-full opacity-50">
                                                <div className="w-5 h-5 bg-white border border-gray-300 rounded-full mt-0.5 ml-0.5"></div>
                                            </div>
                                        </div>

                                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                            <div className="flex items-start gap-3">
                                                <span className="material-symbols-outlined w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5">lightbulb</span>
                                                <div>
                                                    <h4 className="font-medium text-amber-900">Browser Push Works Everywhere!</h4>
                                                    <p className="text-sm text-amber-800 mt-1">
                                                        Browser notifications work on iPhone, Android, desktop, and even when your listing app is "installed" 
                                                        to your phone's home screen. No need to wait for SMS or native apps!
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </FeatureSection>

                                {/* Timing Preferences */}
                                <FeatureSection title="Notification Timing" icon="schedule">
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-3">Quiet Hours</label>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs text-slate-500 mb-1">From</label>
                                                    <input
                                                        type="time"
                                                        defaultValue="22:00"
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-slate-500 mb-1">To</label>
                                                    <input
                                                        type="time"
                                                        defaultValue="08:00"
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-2">No notifications during these hours (except emergencies)</p>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-3">Weekend Notifications</label>
                                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                                <div>
                                                    <h4 className="font-medium text-slate-900">Saturday & Sunday</h4>
                                                    <p className="text-sm text-slate-500">Receive notifications on weekends</p>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={currentNotifications.weekendNotifications !== false}
                                                        onChange={(e) => handleNotificationToggle('weekendNotifications', e.target.checked)}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </FeatureSection>

                                {/* Weekly Summary */}
                                <FeatureSection title="Reports & Analytics" icon="summarize">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                            <div>
                                                <h4 className="font-medium text-slate-900">Weekly Performance Report</h4>
                                                <p className="text-sm text-slate-500">Comprehensive weekly business summary</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={currentNotifications.weeklyReport}
                                                    onChange={(e) => handleNotificationToggle('weeklyReport', e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                            </label>
                                        </div>
                                        
                                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                            <div>
                                                <h4 className="font-medium text-slate-900">Monthly Market Insights</h4>
                                                <p className="text-sm text-slate-500">Market trends and opportunities in your area</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={currentNotifications.monthlyInsights || true}
                                                    onChange={(e) => handleNotificationToggle('monthlyInsights', e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                            </label>
                                        </div>
                                        
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                            <div className="flex items-start gap-3">
                                                <span className="material-symbols-outlined w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5">info</span>
                                                <div>
                                                    <h4 className="font-medium text-blue-900">Smart Notifications</h4>
                                                    <p className="text-sm text-blue-700 mt-1">
                                                        Our AI learns your preferences and will only send you the most relevant notifications. 
                                                        You can always fine-tune these settings as your business grows.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </FeatureSection>
                            </div>
                        )}
                         {activeTab === 'email' && (
                            <form onSubmit={handleEmailSettingsSave} className="p-8 space-y-8">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">📧 Email Settings</h2>
                                    <p className="text-slate-500 mt-1">Connect your email accounts and configure your email preferences for automated sequences.</p>
                                </div>

                                {/* Email Account Connections */}
                                <div className="bg-white rounded-lg border border-slate-200 p-6">
                                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Email Account Connections</h3>
                                    <p className="text-sm text-slate-600 mb-4">
                                        Connect your email accounts to send follow-up sequences and automated emails directly from your own inbox.
                                    </p>
                                    
                                    <div className="space-y-4">
                                        {/* Connection Options */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                            {/* OAuth Connection */}
                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                                <h4 className="text-sm font-semibold text-blue-800 mb-2">🔐 Direct Connection (Recommended)</h4>
                                                <div className="text-xs text-blue-700 space-y-1">
                                                    <p>• Works with Gmail & Outlook</p>
                                                    <p>• 100% authentic emails (no "via" tags)</p>
                                                    <p>• Best deliverability & reputation</p>
                                                    <p>• One-click setup with OAuth</p>
                                                </div>
                                            </div>

                                            {/* Email Forwarding */}
                                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                                <h4 className="text-sm font-semibold text-green-800 mb-2">📧 Email Forwarding (Any Provider)</h4>
                                                <div className="text-xs text-green-700 space-y-1">
                                                    <p>• Works with ANY email provider</p>
                                                    <p>• Yahoo, AOL, custom domains, etc.</p>
                                                    <p>• Simple forwarding rule setup</p>
                                                    <p>• All replies come to your inbox</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Current Setup Status */}
                                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
                                            <h4 className="text-sm font-semibold text-slate-700 mb-2">📬 Your Unique Forwarding Address</h4>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={`agent-${userProfile.email?.split('@')[0] || 'demo'}@homelistingai.com`}
                                                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded text-sm font-mono"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => navigator.clipboard.writeText(`agent-${userProfile.email?.split('@')[0] || 'demo'}@homelistingai.com`)}
                                                    className="px-3 py-2 bg-slate-600 text-white text-xs rounded hover:bg-slate-700 transition"
                                                >
                                                    Copy
                                                </button>
                                            </div>
                                            <p className="text-xs text-slate-600 mt-2">
                                                Set up a forwarding rule in your email client to forward leads to this address. 
                                                <a href="#" className="text-blue-600 hover:underline ml-1">View setup guide →</a>
                                            </p>
                                        </div>

                                        {/* Email preview */}
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Email Preview</label>
                                                <div className="mt-2 p-3 bg-white border border-slate-200 rounded-md text-sm">
                                                    <p><strong>From:</strong> {userProfile.name} &lt;{userProfile.email}&gt;</p>
                                                    <p className="text-xs text-green-600">✓ Looks 100% authentic</p>
                                                </div>
                                            </div>

                                        {/* Connection Status */}
                                        <div className="space-y-4">
                                            {/* Connected Accounts */}
                                            {emailConnections.length > 0 && (
                                                <div className="space-y-2">
                                                    <h4 className="text-sm font-medium text-slate-700">Connected Accounts</h4>
                                                    {emailConnections.map(connection => (
                                                        <div key={connection.provider} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-lg">
                                                                    {connection.provider === 'gmail' ? '📧' : '📬'}
                                                                </span>
                                                                <div>
                                                                    <p className="font-medium text-green-800">{connection.email}</p>
                                                                    <p className="text-xs text-green-600">Connected {new Date(connection.connectedAt).toLocaleDateString()}</p>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => handleEmailDisconnect(connection.provider)}
                                                                className="text-xs px-3 py-1 text-red-600 hover:bg-red-100 rounded"
                                                            >
                                                                Disconnect
                                                 </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Connection Buttons */}
                                            <div className="flex flex-col sm:flex-row gap-3">
                                                {!emailConnections.find(c => c.provider === 'gmail') && (
                                                    <button
                                                        type="button"
                                                        onClick={handleGmailConnect}
                                                        disabled={isConnecting === 'gmail'}
                                                        className="flex-1 flex items-center justify-center gap-3 px-4 py-3 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
                                                    >
                                                        {isConnecting === 'gmail' ? (
                                                            <>
                                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                                <span className="font-semibold">Connecting...</span>
                                                            </>
                                                        ) : (
                                                            <span className="font-semibold">📧 Connect Gmail</span>
                                                        )}
                                                 </button>
                                                )}

                                                {!emailConnections.find(c => c.provider === 'outlook') && (
                                                    <button
                                                        type="button"
                                                        onClick={handleOutlookConnect}
                                                        disabled={isConnecting === 'outlook'}
                                                        className="flex-1 flex items-center justify-center gap-3 px-4 py-3 bg-orange-600 text-white rounded-lg shadow-sm hover:bg-orange-700 disabled:opacity-50 transition"
                                                    >
                                                        {isConnecting === 'outlook' ? (
                                                            <>
                                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                                <span className="font-semibold">Connecting...</span>
                                                            </>
                                                        ) : (
                                                            <span className="font-semibold">📬 Connect Outlook</span>
                                                        )}
                                                    </button>
                                                )}
                                            </div>

                                            {/* Help Text */}
                                            {emailConnections.length === 0 && (
                                                <div className="space-y-3">
                                                    <div className="text-xs text-slate-500 bg-blue-50 border border-blue-200 rounded p-3">
                                                        <p className="font-medium text-blue-800 mb-1">🔐 OAuth Connection</p>
                                                        <p>Secure authentication. Your password is never stored or seen by our app.</p>
                                                    </div>
                                                    
                                                    <div className="text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded p-3">
                                                        <p className="font-medium text-amber-800 mb-1">💡 Don't have Gmail or Outlook?</p>
                                                        <p>No problem! Use the forwarding address above with any email provider (Yahoo, AOL, custom domain, etc.). Just set up email forwarding in your current email client.</p>
                                        </div>
                                    </div>
                                )}
                                        </div>
                                    </div>
                                </div>
                                



                                {/* Email Preferences */}
                                <div className="bg-white rounded-lg border border-slate-200 p-6">
                                    <h3 className="text-lg font-semibold text-slate-800 mb-4">✉️ Email Preferences</h3>
                                    
                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="fromName" className="block text-sm font-medium text-slate-700 mb-1">
                                                Display Name
                                            </label>
                                            <input
                                                type="text"
                                                id="fromName"
                                                name="fromName"
                                                value={emailFormData.fromName || ''}
                                                onChange={(e) => handleEmailSettingsChange('fromName', e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Your Name"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="signature" className="block text-sm font-medium text-slate-700 mb-1">
                                                Email Signature
                                            </label>
                                            <textarea
                                                id="signature"
                                                name="signature"
                                                value={emailFormData.signature || ''}
                                                onChange={(e) => handleEmailSettingsChange('signature', e.target.value)}
                                                rows={4}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Best regards,&#10;Your Name&#10;Real Estate Agent&#10;Phone: (555) 123-4567"
                                            />
                                        </div>

                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id="autoReply"
                                                name="autoReply"
                                                checked={emailFormData.autoReply || false}
                                                onChange={(e) => handleEmailSettingsChange('autoReply', e.target.checked)}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                                            />
                                            <label htmlFor="autoReply" className="ml-2 block text-sm text-slate-700">
                                                Enable auto-reply for new leads
                                            </label>
                                        </div>

                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id="trackOpens"
                                                name="trackOpens"
                                                checked={emailFormData.trackOpens || false}
                                                onChange={(e) => handleEmailSettingsChange('trackOpens', e.target.checked)}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                                            />
                                            <label htmlFor="trackOpens" className="ml-2 block text-sm text-slate-700">
                                                Track email opens and clicks
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                    >
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
                                    <div className="mb-4">
                                        <h3 className="text-lg font-semibold text-slate-800">Choose Calendar Service</h3>
                                        <p className="text-sm text-slate-500 mt-1">Tap a card to select your preferred calendar</p>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
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
                                            icon="calendar_month"
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
                                <FeatureSection title="AI Scheduling Features" icon="calendar_today">
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
                                
                                {/* Current Plan Card */}
                                <div className="max-w-2xl">
                                    <div className="p-8 rounded-2xl shadow-lg border-2 border-primary-500 bg-primary-50">
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <h3 className="text-2xl font-bold text-slate-800">Solo Agent</h3>
                                                <p className="mt-2 text-slate-600">For the individual agent ready to supercharge their business.</p>
                                            </div>
                                            <span className="px-3 py-1 bg-primary-600 text-white text-sm font-semibold rounded-full">Current Plan</span>
                                        </div>
                                        <div className="mb-6">
                                            <p className="text-4xl font-extrabold text-slate-900">$69</p>
                                            <p className="text-lg text-slate-600">per month</p>
                                            <p className="mt-2 text-sm text-slate-500">Up to 5 Active Listings</p>
                                        </div>
                                        <ul className="space-y-3 mb-8">
                                            <PlanFeature>Full Dashboard Access</PlanFeature>
                                            <PlanFeature>AI Content Studio</PlanFeature>
                                            <PlanFeature>Automated Follow-up Sequences</PlanFeature>
                                            <PlanFeature>AI Inbox & Lead Management</PlanFeature>
                                            <PlanFeature>Standard Support</PlanFeature>
                                        </ul>
                                        <div className="flex gap-4">
                                            <button className="flex-1 py-3 px-6 text-lg font-bold rounded-lg transition-colors duration-300 bg-primary-600 text-white shadow-md hover:bg-primary-700">
                                                Manage Plan
                                            </button>
                                            <button 
                                                onClick={() => setShowCancelModal(true)}
                                                className="flex-1 py-3 px-6 text-lg font-bold rounded-lg transition-colors duration-300 bg-red-600 text-white shadow-md hover:bg-red-700"
                                            >
                                                Cancel Subscription
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Cancel Subscription Modal */}
                                {showCancelModal && (
                                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                        <div className="bg-white rounded-lg p-8 max-w-md mx-4">
                                            <h3 className="text-xl font-bold text-slate-900 mb-4">Cancel Subscription</h3>
                                            <p className="text-slate-600 mb-6">
                                                Are you sure you want to cancel your subscription? You'll lose access to all premium features at the end of your current billing period.
                                            </p>
                                            <div className="flex gap-4">
                                                <button 
                                                    onClick={() => setShowCancelModal(false)}
                                                    className="flex-1 py-2 px-4 text-sm font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                                                >
                                                    Keep Subscription
                                                </button>
                                                <button 
                                                    onClick={handleCancelSubscription}
                                                    className="flex-1 py-2 px-4 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700"
                                                >
                                                    Cancel Subscription
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
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
                        {activeTab === 'calendar' && (
                            <form onSubmit={handleCalendarSettingsSave} className="p-8 space-y-8">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">📅 Calendar Integration</h2>
                                    <p className="text-slate-500 mt-1">Connect your Google Calendar to automatically schedule consultations and manage appointments.</p>
                                </div>

                                {/* Google Calendar Connection */}
                                <FeatureSection title="Google Calendar Connection" icon="calendar_today">
                                    <div className="space-y-6">
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                                    <span className="material-symbols-outlined text-white w-6 h-6">calendar_today</span>
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-semibold text-blue-900 mb-2">Google Calendar Integration</h3>
                                                    <div className="text-sm text-blue-800 space-y-1 mb-4">
                                                        <p>• ✅ Automatic consultation scheduling</p>
                                                        <p>• ✅ Google Meet video links generated</p>
                                                        <p>• ✅ Calendar invites sent to clients</p>
                                                        <p>• ✅ Appointment reminders & notifications</p>
                                                        <p>• ✅ Sync with your existing calendar</p>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-4">
                                                        <button
                                                            type="button"
                                                            onClick={handleGoogleCalendarConnect}
                                                            disabled={isConnecting === 'google'}
                                                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined w-4 h-4">link</span>
                                                            {isConnecting === 'google' ? 'Connecting...' : 'Connect Google Calendar'}
                                                        </button>
                                                        
                                                        {isGoogleCalendarConnected && (
                                                            <div className="flex items-center gap-2 text-green-700">
                                                                <span className="material-symbols-outlined w-4 h-4">check_circle</span>
                                                                <span className="text-sm font-medium">Connected</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {isGoogleCalendarConnected && (
                                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="material-symbols-outlined w-5 h-5 text-green-600">check_circle</span>
                                                    <div>
                                                        <h4 className="font-medium text-green-900">Calendar Connected Successfully!</h4>
                                                        <p className="text-sm text-green-700 mt-1">
                                                            Consultations booked through your website will automatically appear in your Google Calendar with Meet links.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </FeatureSection>

                                {/* Calendar Preferences */}
                                <FeatureSection title="Booking Preferences" icon="tune">
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-3">Available Hours</label>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs text-slate-500 mb-1">Start Time</label>
                                                    <input
                                                        type="time"
                                                        name="startTime"
                                                        value={calendarFormData.workingHours?.start || '09:00'}
                                                        onChange={handleCalendarInputChange}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-slate-500 mb-1">End Time</label>
                                                    <input
                                                        type="time"
                                                        name="endTime"
                                                        value={calendarFormData.workingHours?.end || '17:00'}
                                                        onChange={handleCalendarInputChange}
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
                                                            checked={calendarFormData.workingDays?.includes(day.toLowerCase()) || false}
                                                            onChange={(e) => handleWorkingDayToggle(day.toLowerCase(), e.target.checked)}
                                                            className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                                        />
                                                        <span className="text-sm text-slate-700">{day.slice(0, 3)}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-3">Consultation Duration</label>
                                            <select
                                                name="defaultDuration"
                                                value={calendarFormData.defaultDuration || 30}
                                                onChange={handleCalendarInputChange}
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

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-3">Buffer Time</label>
                                            <select
                                                name="bufferTime"
                                                value={calendarFormData.bufferTime || 15}
                                                onChange={handleCalendarInputChange}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                            >
                                                <option value={0}>No buffer</option>
                                                <option value={5}>5 minutes</option>
                                                <option value={10}>10 minutes</option>
                                                <option value={15}>15 minutes</option>
                                                <option value={30}>30 minutes</option>
                                            </select>
                                            <p className="text-xs text-slate-500 mt-2">Time between appointments for travel/preparation</p>
                                        </div>
                                    </div>
                                </FeatureSection>

                                {/* Notifications */}
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
                                                    checked={calendarFormData.emailReminders !== false}
                                                    onChange={(e) => handleCalendarToggle('emailReminders', e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                            </label>
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                            <div>
                                                <h4 className="font-medium text-slate-900">SMS Reminders</h4>
                                                <p className="text-sm text-slate-500">Send SMS reminders (requires phone number)</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={calendarFormData.smsReminders || false}
                                                    onChange={(e) => handleCalendarToggle('smsReminders', e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                            </label>
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                            <div>
                                                <h4 className="font-medium text-slate-900">New Appointment Alerts</h4>
                                                <p className="text-sm text-slate-500">Get notified when someone books a consultation</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={calendarFormData.newAppointmentAlerts !== false}
                                                    onChange={(e) => handleCalendarToggle('newAppointmentAlerts', e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                            </label>
                                        </div>
                                    </div>
                                </FeatureSection>

                                <div className="flex items-center justify-between pt-8 border-t border-slate-200">
                                    <button
                                        type="button"
                                        onClick={onBackToDashboard}
                                        className="px-6 py-2 text-slate-600 hover:text-slate-800 transition-colors"
                                    >
                                        ← Back to Dashboard
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                                    >
                                        Save Calendar Settings
                                    </button>
                                </div>
                            </form>
                        )}
                        
                        {activeTab === 'security' && (
                            <form onSubmit={handlePasswordSave} className="p-8 space-y-8">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">🔐 Security Settings</h2>
                                    <p className="text-slate-500 mt-1">Manage your account security, passwords, and privacy settings.</p>
                                </div>

                                {/* Password Change */}
                                <FeatureSection title="Change Password" icon="lock">
                                    <div className="space-y-6">
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
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Current Password</label>
                                                <input
                                                    type="password"
                                                    name="currentPassword"
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

                                {/* Security Features */}
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
                                                    checked={securitySettings.loginNotifications !== false}
                                                    onChange={(e) => handleSecurityToggle('loginNotifications', e.target.checked)}
                                                    className="sr-only peer"
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
                                                value={securitySettings.sessionTimeout || 24}
                                                onChange={(e) => handleSecurityToggle('sessionTimeout', parseInt(e.target.value))}
                                                className="px-3 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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

                                {/* Privacy Settings */}
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
                                                    checked={securitySettings.analyticsEnabled !== false}
                                                    onChange={(e) => handleSecurityToggle('analyticsEnabled', e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                            </label>
                                        </div>

                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                            <div className="flex items-start gap-3">
                                                <span className="material-symbols-outlined w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5">shield</span>
                                                <div>
                                                    <h4 className="font-medium text-blue-900">Your Data is Secure</h4>
                                                    <p className="text-sm text-blue-700 mt-1">
                                                        All your data is encrypted and stored securely. We never share your personal information with third parties.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </FeatureSection>

                                <div className="flex items-center justify-between pt-8 border-t border-slate-200">
                                    <button
                                        type="button"
                                        onClick={onBackToDashboard}
                                        className="px-6 py-2 text-slate-600 hover:text-slate-800 transition-colors"
                                    >
                                        ← Back to Dashboard
                                    </button>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={handleSecuritySettingsSave}
                                            className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                                        >
                                            Save Security Settings
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}
                        
                                                {activeTab === 'billing' && (
                            <div className="p-8 space-y-8">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">💳 Billing & Subscription</h2>
                                    <p className="text-slate-500 mt-1">Manage your subscription, billing information, and payment methods.</p>
                                </div>

                                {/* Current Plan Status */}
                                <FeatureSection title="Current Plan" icon="star">
                                    <div className="bg-gradient-to-tr from-primary-700 to-primary-500 text-white rounded-2xl p-8 shadow-2xl">
                                        <div className="flex items-center justify-between mb-6">
                                            <div>
                                                <h3 className="text-2xl font-bold text-white">Complete AI Solution</h3>
                                                <p className="text-slate-300">Everything you need to dominate your market</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-3xl font-bold">$79<span className="text-lg font-medium">/mo</span></div>
                                                <div className="text-sm text-slate-300">Next billing: Jan 15, 2025</div>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined w-4 h-4 text-green-400">check_circle</span>
                                                <span>500 AI interactions/month</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined w-4 h-4 text-green-400">check_circle</span>
                                                <span>1GB storage space</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined w-4 h-4 text-green-400">check_circle</span>
                                                <span>200 emails/month</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined w-4 h-4 text-green-400">check_circle</span>
                                                <span>Advanced analytics</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined w-4 h-4 text-green-400">check_circle</span>
                                                <span>AI Content Studio</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined w-4 h-4 text-green-400">check_circle</span>
                                                <span>Priority support</span>
                                            </div>
                                        </div>
                                    </div>
                                </FeatureSection>

                                {/* Payment Method */}
                                <FeatureSection title="Payment Method" icon="payment">
                                    <div className="space-y-6">
                                        <div className="bg-white border border-slate-200 rounded-lg p-6">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-8 bg-blue-600 rounded flex items-center justify-center">
                                                        <span className="text-white font-bold text-sm">PP</span>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-medium text-slate-900">PayPal</h4>
                                                        <p className="text-sm text-slate-500">your.email@example.com</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">Active</span>
                                                    <button className="text-primary-600 text-sm font-medium hover:text-primary-700">
                                                        Change
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleAddPaymentMethod}
                                            className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-primary-500 hover:text-primary-600 transition-colors w-full justify-center"
                                        >
                                            <span className="material-symbols-outlined w-5 h-5">add</span>
                                            Add Payment Method
                                        </button>
                                    </div>
                                </FeatureSection>

                                {/* Billing History */}
                                <FeatureSection title="Billing History" icon="receipt">
                                    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-slate-50">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Description</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Invoice</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200">
                                                    <tr>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">Dec 15, 2024</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">Complete AI Solution - Monthly</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">$79.00</td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">Paid</span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                            <button className="text-primary-600 hover:text-primary-700">Download</button>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">Nov 15, 2024</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">Complete AI Solution - Monthly</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">$79.00</td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">Paid</span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                            <button className="text-primary-600 hover:text-primary-700">Download</button>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">Oct 15, 2024</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">Complete AI Solution - Monthly</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">$79.00</td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">Paid</span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                            <button className="text-primary-600 hover:text-primary-700">Download</button>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </FeatureSection>

                                {/* Subscription Management */}
                                <FeatureSection title="Subscription Management" icon="settings">
                                    <div className="space-y-4">
                                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                            <div className="flex items-start gap-3">
                                                <span className="material-symbols-outlined w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5">info</span>
                                                <div>
                                                    <h4 className="font-medium text-amber-900">Subscription Changes</h4>
                                                    <p className="text-sm text-amber-800 mt-1">
                                                        Changes to your subscription will take effect at the next billing cycle.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-4">
                                            <button
                                                onClick={handleUpgradePlan}
                                                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                            >
                                                <span className="material-symbols-outlined w-5 h-5">upgrade</span>
                                                Upgrade Plan
                                            </button>
                                            
                                            <button
                                                onClick={handleUpdateBilling}
                                                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                            >
                                                <span className="material-symbols-outlined w-5 h-5">edit</span>
                                                Update Billing Info
                                            </button>
                                            
                                            <button
                                                onClick={handleCancelSubscription}
                                                className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                            >
                                                <span className="material-symbols-outlined w-5 h-5">cancel</span>
                                                Cancel Subscription
                                            </button>
                                        </div>
                                    </div>
                                </FeatureSection>

                                <div className="flex items-center justify-between pt-8 border-t border-slate-200">
                                    <button
                                        type="button"
                                        onClick={onBackToDashboard}
                                        className="px-6 py-2 text-slate-600 hover:text-slate-800 transition-colors"
                                    >
                                        ← Back to Dashboard
                                    </button>
                                    <div className="text-sm text-slate-500">
                                        Questions? <a href="mailto:support@homelistingai.com" className="text-primary-600 hover:text-primary-700">Contact Support</a>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {activeTab !== 'notifications' && activeTab !== 'email' && activeTab !== 'calendar' && activeTab !== 'security' && activeTab !== 'billing' && (
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
