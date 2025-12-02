import React, { useState } from 'react';
import AISidekicks from '../../components/AISidekicks';
import AdminTrainingStudio from './AdminTrainingStudio';

interface AdminAISidekicksPageProps {
    initialTab?: 'overview' | 'training';
}

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
                            AI Sidekicks
                        </h1>
                        <p className="text-slate-600 mt-1">
                            Manage and train your AI assistants
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
                        <AISidekicks />
                    </div>
                ) : (
                    <AdminTrainingStudio />
                )}
            </div>
        </div>
    );
};

export default AdminAISidekicksPage;
