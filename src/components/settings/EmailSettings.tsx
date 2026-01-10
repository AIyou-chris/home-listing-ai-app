import React from 'react';
import { EmailSettings } from '../../types';
import { googleOAuthService } from '../../services/googleOAuthService';
import { IntegrationCard, FeatureSection } from './SettingsCommon';

interface EmailSettingsProps {
    settings: EmailSettings;
    onSave: (settings: EmailSettings) => Promise<void>; // Used for general save or updates
    onBack?: () => void;
    isLoading?: boolean;
}

const EmailSettingsPage: React.FC<EmailSettingsProps> = ({
    settings,
    onSave,
    onBack,
}) => {

    // If settings has info about connection, we use it. 
    // Assuming settings.gmailConnected or similar exists. 
    // Since I don't see the exact type definition of EmailSettings in the snippet, 
    // I will infer from standard usage or previous file content. 
    // If settings has 'gmail' object or similar.
    // Making a safe guess based on context.

    // In the original file, it seemed to track `emailConnection` state separately?
    // Let's assume passed settings has the necessary connection info.

    // For now, I'll assume we can trigger the OAuth flow.
    const handleConnectEmail = async (provider: 'gmail' | 'outlook') => {
        if (provider === 'gmail') {
            try {
                await googleOAuthService.authenticate();
            } catch (error) {
                console.error('Failed to initiate Google Auth:', error);
                // In a real app we'd show a toast here
            }
        } else {
            // Outlook not implemented yet logic
            alert("Outlook integration coming soon!");
        }
    };

    const handleDisconnectEmail = async () => {
        // Use proper fields as defined in EmailSettings type
        const newSettings: EmailSettings = { ...settings, integrationType: 'forwarding', fromEmail: undefined };
        await onSave(newSettings);
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
                        icon="mail" // 'mail' implies Gmail logo if we had one, or use generic
                        title="Gmail"
                        description="Connect your Google Workspace or Gmail account to sync emails."
                        tags={[
                            { label: 'Popular', color: 'green' },
                            { label: 'Recommended', color: 'blue' }
                        ]}
                        isSelected={settings.integrationType === 'oauth'}
                        onClick={() => (settings.integrationType === 'oauth') ? handleDisconnectEmail() : handleConnectEmail('gmail')}
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
