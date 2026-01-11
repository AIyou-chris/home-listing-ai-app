import React, { useState, useEffect } from 'react';
import { EmailSettings } from '../../types';
import { emailAuthService, EmailConnection } from '../../services/emailAuthService';
import { IntegrationCard, FeatureSection } from './SettingsCommon';

interface EmailSettingsProps {
    settings: EmailSettings;
    onSave: (settings: EmailSettings) => Promise<void>;
    onBack?: () => void;
    isLoading?: boolean;
    agentSlug?: string;
}

const EmailSettingsPage: React.FC<EmailSettingsProps> = ({
    settings,
    onSave,
    onBack,
    agentSlug
}) => {
    const [activeTab, setActiveTab] = useState<'connect' | 'forwarding'>('connect');
    const [gmailConnection, setGmailConnection] = useState<EmailConnection | undefined>(
        emailAuthService.getConnection('gmail')
    );

    const inboundEmail = agentSlug ? `${agentSlug}@leads.homelistingai.com` : 'your-slug@leads.homelistingai.com';

    useEffect(() => {
        setGmailConnection(emailAuthService.getConnection('gmail'));
    }, []);

    const handleConnectEmail = async (provider: 'gmail' | 'outlook') => {
        if (provider === 'gmail') {
            try {
                const connection = await emailAuthService.connectGmail();
                setGmailConnection(connection);
                await onSave({ ...settings, integrationType: 'oauth' });
            } catch (error) {
                console.error('Failed to initiate Google Auth:', error);
            }
        } else {
            alert("Outlook integration coming soon!");
        }
    };

    const handleDisconnectEmail = async (provider: 'gmail' | 'outlook') => {
        try {
            await emailAuthService.disconnect(provider);
            setGmailConnection(undefined);
            await onSave({ ...settings, integrationType: 'forwarding' });
        } catch (error) {
            console.error(`Failed to disconnect ${provider}:`, error);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(inboundEmail);
        // Could add toast here
    };

    return (
        <div className="p-8 space-y-8 animate-fadeIn">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">📧 Email Integration</h2>
                <p className="text-slate-500 mt-1">Connect your email to sync conversations and leads.</p>
            </div>

            {/* Method Selection Tabs */}
            <div className="flex p-1 bg-slate-100 rounded-lg w-fit">
                <button
                    onClick={() => setActiveTab('connect')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'connect'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                        }`}
                >
                    Connect Account
                </button>
                <button
                    onClick={() => setActiveTab('forwarding')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'forwarding'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                        }`}
                >
                    Email Forwarding
                </button>
            </div>

            {activeTab === 'connect' ? (
                <FeatureSection title="Connect Email" icon="mail">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <IntegrationCard
                            icon="mail"
                            title="Gmail"
                            description={gmailConnection ? `Connected as ${gmailConnection.email}` : "Connect your Google Workspace or Gmail account to sync emails."}
                            tags={gmailConnection ? [
                                { label: 'Connected', color: 'green' }
                            ] : [
                                { label: 'Popular', color: 'green' },
                                { label: 'Recommended', color: 'blue' }
                            ]}
                            isSelected={!!gmailConnection}
                            onClick={() => gmailConnection ? handleDisconnectEmail('gmail') : handleConnectEmail('gmail')}
                        />
                        <IntegrationCard
                            icon="mail_outline"
                            title="Outlook"
                            description="Connect your Microsoft Outlook account (Coming Soon)."
                            tags={[
                                { label: 'Coming Soon', color: 'yellow' }
                            ]}
                            isSelected={false}
                            onClick={() => handleConnectEmail('outlook')}
                        />
                    </div>
                </FeatureSection>
            ) : (
                <FeatureSection title="Inbound Lead Forwarding" icon="forward_to_inbox">
                    <div className="space-y-6">
                        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-indigo-900 mb-2">Your Dedicated Lead Address</h3>
                            <p className="text-indigo-700 mb-6 max-w-xl">
                                Use this unique email address to forward leads from Zillow, Realtor.com, Redfin, and other portals directly to your AI dashboard.
                            </p>

                            <div className="flex items-center gap-2 max-w-md">
                                <code className="flex-1 block p-4 bg-white border border-indigo-200 rounded-lg text-indigo-600 font-mono text-lg font-bold text-center select-all">
                                    {inboundEmail}
                                </code>
                                <button
                                    onClick={copyToClipboard}
                                    className="p-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                                    title="Copy to clipboard"
                                >
                                    <span className="material-symbols-outlined">content_copy</span>
                                </button>
                            </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
                            <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-slate-400">help</span>
                                How to set this up?
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <div className="font-medium text-slate-900">1. Copy Address</div>
                                    <p className="text-sm text-slate-500">Click the copy button above to grab your unique forwarding address.</p>
                                </div>
                                <div className="space-y-2">
                                    <div className="font-medium text-slate-900">2. Update Portals</div>
                                    <p className="text-sm text-slate-500">Log in to your lead sources (Zillow, Website, etc.) and find "Notification Email" settings.</p>
                                </div>
                                <div className="space-y-2">
                                    <div className="font-medium text-slate-900">3. Paste & Save</div>
                                    <p className="text-sm text-slate-500">Paste your <strong>leads.homelistingai.com</strong> address and save. Leads will now appear instantly!</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </FeatureSection>
            )}

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
            </div>
        </div>
    );
};

export default EmailSettingsPage;
