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

    // FILTER FOR SINGLE AGENT (User Request: "Single AI agent... does not have activate")
    // We strictly filter for the 'agent' ID if overrides are present, or we need to fetch defaults if not.
    // However, App.tsx passes overrides for Blueprint.
    // If overrides are present, we filter to 'agent'.
    const singleAgentList = sidekickTemplatesOverride
        ? sidekickTemplatesOverride.filter(s => s.id === 'agent')
        : undefined;

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
                            hideLifecycleControls={true} // User Request: "Does not have activate agent sidekick"
                            sidekickTemplatesOverride={singleAgentList}
                        />
                    </div>
                ) : (
                    <div className="h-full flex flex-col overflow-hidden">
                        <div className="p-4 md:p-6 pb-0">
                            <PageTipBanner
                                pageKey="ai-training"
                                expandedContent={
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div>
                                            <h4 className="font-bold text-indigo-900 mb-3 text-lg">🎓 AI Training Studio</h4>
                                            <p className="text-slate-600 mb-4 text-sm leading-relaxed">
                                                Your AI is smart, but it doesn't know your specific business yet. This studio is where you teach it to sound like you.
                                            </p>

                                            <div className="space-y-4">
                                                <h5 className="font-semibold text-slate-900 border-b border-indigo-100 pb-1">How It Works</h5>
                                                <ul className="space-y-3 text-slate-700 text-sm">
                                                    <li className="flex items-start gap-3">
                                                        <div className="mt-0.5 p-1 bg-indigo-50 rounded text-indigo-600">
                                                            <span className="material-symbols-outlined text-sm">chat</span>
                                                        </div>
                                                        <span><strong>Roleplay Mode:</strong> Chat with your AI as if you were a difficult lead. Test how it handles objections about commission or market timing.</span>
                                                    </li>
                                                    <li className="flex items-start gap-3">
                                                        <div className="mt-0.5 p-1 bg-indigo-50 rounded text-indigo-600">
                                                            <span className="material-symbols-outlined text-sm">thumb_down</span>
                                                        </div>
                                                        <span><strong>Feedback Loop:</strong> If the AI says something generic, click <span className="material-symbols-outlined text-[10px] bg-slate-100 p-0.5 rounded">thumb_down</span> and type the correct answer. It updates its long-term memory instantly.</span>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>

                                        <div className="bg-white/50 rounded-xl p-4 border border-indigo-50">
                                            <h5 className="font-semibold text-slate-900 border-b border-indigo-100 pb-1 mb-3">Workflow Success Tips</h5>
                                            <ul className="space-y-3 text-slate-700 text-sm">
                                                <li className="flex items-start gap-3">
                                                    <span className="mr-1 text-lg">⏱️</span>
                                                    <span><strong>The 15-Minute Sprint:</strong> Spend just 15 minutes a week here. Pick one topic (e.g., "Why buy now?") and drill the AI until it's perfect.</span>
                                                </li>
                                                <li className="flex items-start gap-3">
                                                    <span className="mr-1 text-lg">📄</span>
                                                    <span><strong>Upload Your Brain:</strong> Don't just type. Paste your existing scripts, FAQ docs, or past email threads into the chat and say "Learn this style."</span>
                                                </li>
                                                <li className="flex items-start gap-3">
                                                    <span className="mr-1 text-lg">🚀</span>
                                                    <span><strong>Trust But Verify:</strong> Once you trust the AI in this safe sandbox, you can let it run on autopilot with real leads confidently.</span>
                                                </li>
                                            </ul>
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
