import React, { useState, useEffect } from 'react';
import { EmailSettings } from '../../types';
import { emailAuthService, EmailConnection } from '../../services/emailAuthService';
import { IntegrationCard, FeatureSection } from './SettingsCommon';

interface EmailSettingsProps {
    settings: EmailSettings;
    onSave: (settings: EmailSettings) => Promise<void>;
    onBack?: () => void;
    isLoading?: boolean;
}

const EmailSettingsPage: React.FC<EmailSettingsProps> = ({
    settings,
    onSave,
    onBack,
}) => {
    const [gmailConnection, setGmailConnection] = useState<EmailConnection | undefined>(
        emailAuthService.getConnection('gmail')
    );

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

    return (
        <div className="p-8 space-y-8 animate-fadeIn">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">📧 Email Integration</h2>
                <p className="text-slate-500 mt-1">Connect your email to sync conversations and leads.</p>
            </div>

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
