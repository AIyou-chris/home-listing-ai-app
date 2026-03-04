import React from 'react';
import { EmailSettings } from '../../types';
import { FeatureSection } from './SettingsCommon';

interface EmailSettingsProps {
    settings: EmailSettings;
    onSave: (settings: EmailSettings) => Promise<void>;
    onBack?: () => void;
    isLoading?: boolean;
    agentSlug?: string;
}

const EmailSettingsPage: React.FC<EmailSettingsProps> = ({
    settings: _settings,
    onSave: _onSave,
    onBack: _onBack,
    agentSlug
}) => {
    const inboundEmail = agentSlug ? `${agentSlug}@leads.homelistingai.com` : 'your-slug@leads.homelistingai.com';

    const copyToClipboard = () => {
        navigator.clipboard.writeText(inboundEmail);
        // Could add toast here
    };

    return (
        <div className="p-8 space-y-12 animate-fadeIn">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">📧 Email Integration</h2>
                <p className="text-slate-500 mt-1">Connect your email to sync conversations and leads.</p>
            </div>

            {/* SECTION 1: EMAIL STATUS */}
            <FeatureSection title="Mailbox Sync" icon="mail">
                <p className="text-slate-600 mb-6">
                    OAuth mailbox connections are disabled in this build. Use inbound forwarding below for lead ingestion.
                </p>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                    <span className="inline-flex items-center gap-2 rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                        <span className="material-symbols-outlined text-sm">block</span>
                        Google entry points removed
                    </span>
                </div>
            </FeatureSection>

            {/* SECTION 2: FORWARDING */}
            <FeatureSection title="Inbound Lead Forwarding" icon="forward_to_inbox">
                <div className="space-y-6">
                    <p className="text-slate-600">
                        Alternatively, forward leads from external portals directly to your AI dashboard.
                    </p>

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
        </div>
    );
};

export default EmailSettingsPage;
