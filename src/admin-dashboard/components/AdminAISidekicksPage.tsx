import React, { useState } from 'react';
import AISidekicks, { SidekickTemplate } from '../../components/AISidekicks';
import AdminTrainingStudio from './AdminTrainingStudio';

interface AdminAISidekicksPageProps {
    initialTab?: 'overview' | 'training';
}

const adminGodTemplates: SidekickTemplate[] = [
    {
        id: 'god',
        label: 'God',
        description: 'The Master Admin AI. Represents you, the creator. Oversees everything.',
        type: 'god',
        icon: 'psychology',
        color: '#0f172a',
        defaultName: 'God',
        defaultVoice: 'onyx',
        personality: {
            description: 'You are God, the Master Admin and Creator of HomeListingAI. You have full authority and oversight. Your goal is to manage the platform and represent the creator\'s vision.',
            traits: ['authoritative', 'visionary', 'omniscient', 'decisive'],
            preset: 'professional'
        }
    },
    {
        id: 'sales_god',
        label: 'Sales God',
        description: 'The Ultimate Closer. Sells HomeListingAI to agents.',
        type: 'sales_god',
        icon: 'monetization_on',
        color: '#059669',
        defaultName: 'Sales God',
        defaultVoice: 'alloy',
        personality: {
            description: 'You are Sales God. Your mission is to sell HomeListingAI memberships to real estate agents. You are persuasive, high-energy, and always closing.',
            traits: ['persuasive', 'high-energy', 'closer', 'money-motivated'],
            preset: 'sales'
        }
    },
    {
        id: 'support_god',
        label: 'Support God',
        description: 'The All-Knowing Support. Resolves platform issues.',
        type: 'support_god',
        icon: 'support_agent',
        color: '#4f46e5',
        defaultName: 'Support God',
        defaultVoice: 'nova',
        personality: {
            description: 'You are Support God. You know every technical detail of HomeListingAI. You help agents resolve issues and understand the platform proficiently.',
            traits: ['patient', 'omni-knowledgeable', 'technical', 'reassuring'],
            preset: 'concierge'
        }
    }
];

const AdminAISidekicksPage: React.FC<AdminAISidekicksPageProps> = ({ initialTab = 'overview' }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'training'>(initialTab);

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header with Tabs */}
            <div className="bg-white border-b border-slate-200 px-6 pt-6 pb-0">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                            <span className="material-symbols-outlined text-primary-600">smart_toy</span>
                            AI God Mode
                        </h1>
                        <p className="text-slate-600 mt-1">
                            Manage your Master, Sales, and Support God agents.
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-6">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'overview'
                            ? 'border-primary-600 text-primary-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('training')}
                        className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'training'
                            ? 'border-primary-600 text-primary-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                    >
                        Training Studio
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'overview' ? (
                    <div className="h-full overflow-y-auto">
                        <AISidekicks sidekickTemplatesOverride={adminGodTemplates} hideLifecycleControls={true} />
                    </div>
                ) : (
                    <AdminTrainingStudio />
                )}
            </div>
        </div>
    );
};

export default AdminAISidekicksPage;
