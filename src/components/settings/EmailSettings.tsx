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
    const normalizedSlug = agentSlug?.trim().toLowerCase() || '';
    const inboundEmail = normalizedSlug ? `${normalizedSlug}@leads.homelistingai.com` : 'your-slug@leads.homelistingai.com';
    const dashboardSlugPath = normalizedSlug ? `/dashboard/${normalizedSlug}` : '/dashboard/your-slug';

    const copyToClipboard = () => {
        navigator.clipboard.writeText(inboundEmail);
        // Could add toast here
    };

    return (
        <div className="p-8 space-y-12 animate-fadeIn">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">📧 Lead Inbox</h2>
                <p className="text-slate-500 mt-1">This is your dedicated intake address for portal leads and forwarded buyer inquiries.</p>
            </div>

            <FeatureSection title="Lead Inbox Routing" icon="mail">
                <p className="text-slate-600 mb-6">
                    HomeListingAI routes forwarded leads by your account slug. No Gmail connection is required for this flow.
                </p>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="rounded-lg border border-slate-200 bg-white p-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Dashboard slug</div>
                            <div className="mt-2 text-base font-bold text-slate-900">{normalizedSlug || 'your-slug'}</div>
                            <div className="mt-1 text-sm text-slate-500">This is the slug your dashboard and lead inbox share.</div>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white p-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Slug path</div>
                            <div className="mt-2 text-base font-bold text-slate-900">{dashboardSlugPath}</div>
                            <div className="mt-1 text-sm text-slate-500">If the slug changes, the lead inbox address changes with it.</div>
                        </div>
                    </div>
                </div>
            </FeatureSection>

            <FeatureSection title="Inbound Lead Forwarding" icon="forward_to_inbox">
                <div className="space-y-6">
                    <p className="text-slate-600">
                        Forward leads from Zillow, Realtor.com, Redfin, Facebook ads, or any other source directly into your dashboard with this address.
                    </p>

                    <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-indigo-900 mb-2">Your Dedicated Lead Address</h3>
                        <p className="text-indigo-700 mb-6 max-w-xl">
                            This address is automatically built from your dashboard slug, so the inbox and account stay lined up.
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
                            How to set this up
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <div className="font-medium text-slate-900">1. Copy Address</div>
                                <p className="text-sm text-slate-500">Click the copy button above to grab your unique forwarding address.</p>
                            </div>
                            <div className="space-y-2">
                                <div className="font-medium text-slate-900">2. Update Portals</div>
                                <p className="text-sm text-slate-500">Open your lead source and find the place where new leads are emailed.</p>
                            </div>
                            <div className="space-y-2">
                                <div className="font-medium text-slate-900">3. Paste & Save</div>
                                <p className="text-sm text-slate-500">Paste your <strong>leads.homelistingai.com</strong> address and save. New leads will flow into the same dashboard slug shown above.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </FeatureSection>
        </div>
    );
};

export default EmailSettingsPage;
