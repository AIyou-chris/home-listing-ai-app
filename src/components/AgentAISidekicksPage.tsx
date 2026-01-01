import React, { useState } from 'react';
import AISidekicks from './AISidekicks';
import UnifiedTrainingStudio from './UnifiedTrainingStudio';
import PageTipBanner from './PageTipBanner';

interface AgentAISidekicksPageProps {
    isDemoMode?: boolean;
    sidekickTemplatesOverride?: {
        id: string;
        label: string;
        description: string;
        type: string;
        icon: string;
        color: string;
        defaultName: string;
        defaultVoice: string;
        personality: { description: string; traits: string[]; preset: string };
    }[];
    initialTab?: 'overview' | 'training';
}

const AgentAISidekicksPage: React.FC<AgentAISidekicksPageProps> = ({
    isDemoMode = false,
    sidekickTemplatesOverride,
    initialTab = 'overview'
}) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'training'>(initialTab);

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header with Tabs */}
            <div className="bg-white border-b border-slate-200 px-6 pt-6 pb-0">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                            <span className="material-symbols-outlined text-primary-600">smart_toy</span>
                            AI Agent
                        </h1>
                        <p className="text-slate-600 mt-1">
                            Manage and train your AI Agent
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-6">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'overview'
                            ? 'border-blue-800 text-blue-800'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                    >
                        My AI Agent
                    </button>
                    <button
                        onClick={() => setActiveTab('training')}
                        className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'training'
                            ? 'border-blue-800 text-blue-800'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                    >
                        Train Your AI
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'overview' ? (
                    <div className="h-full overflow-y-auto p-0 md:p-6">
                        <AISidekicks
                            isDemoMode={isDemoMode}
                            sidekickTemplatesOverride={sidekickTemplatesOverride}
                        />
                    </div>
                ) : (
                    <div className="h-full flex flex-col overflow-hidden">
                        <div className="p-4 md:p-6 pb-0">
                            <PageTipBanner
                                pageKey="ai-training"
                                expandedContent={
                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="font-semibold text-slate-900 mb-2">🎓 How to Train Your AI Business Partner:</h4>
                                            <ul className="space-y-2 text-slate-700">
                                                <li className="flex items-start">
                                                    <span className="mr-2">💬</span>
                                                    <span><strong>Chat Naturally:</strong> Ask questions or give commands just like you would to a human assistant (e.g., "Write a listing description").</span>
                                                </li>
                                                <li className="flex items-start">
                                                    <span className="mr-2">👍</span>
                                                    <span><strong>Give Feedback:</strong> Use the Thumbs Up/Down buttons on every response. This is the #1 way the AI learns your preferences.</span>
                                                </li>
                                                <li className="flex items-start">
                                                    <span className="mr-2">✏️</span>
                                                    <span><strong>Correct Mistakes:</strong> If a response isn't right, click Thumbs Down and provide the "Better Answer". The AI updates its memory instantly.</span>
                                                </li>
                                            </ul>
                                        </div>
                                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
                                            <h4 className="font-semibold text-blue-900 mb-2">💎 The Payoff:</h4>
                                            <p className="text-blue-800">
                                                Spending just 15 minutes training your AI on your scripts and style can save you 10+ hours a week. A well-trained AI can handle 80% of routine inquiries autonomously, sounding exactly like you.
                                            </p>
                                        </div>
                                    </div>
                                }
                            />
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <UnifiedTrainingStudio
                                mode="blueprint"
                                demoMode={isDemoMode}
                                sidekicks={sidekickTemplatesOverride?.map(s => {
                                    let suggestedQuestions: string[] = [];
                                    if (s.id === 'agent') {
                                        suggestedQuestions = [
                                            "How would you handle a lead who says they are just looking?",
                                            "Draft a follow-up text for a missed appointment.",
                                            "Summarize my last conversation with Emily Rodriguez.",
                                            "Write an email campaign for a new luxury listing.",
                                            "Create 3 social media posts for an open house.",
                                            "Write a listing description for a 3-bed modern home.",
                                            "What are the key selling points for a home with a pool?"
                                        ];
                                    }

                                    return {
                                        id: s.id,
                                        name: s.label,
                                        icon: s.icon,
                                        description: s.description,
                                        systemPrompt: s.personality.description,
                                        color: s.color,
                                        suggestedQuestions
                                    };
                                })}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AgentAISidekicksPage;
