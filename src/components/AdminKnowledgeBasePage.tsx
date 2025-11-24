import React, { useState } from 'react';
import { AgentProfile } from '../types';
import { generateText } from '../services/geminiService';

interface AdminKnowledgeBasePageProps {
    agentProfile: AgentProfile;
}

type TabId = 'agent' | 'listing' | 'personalities' | 'conversations' | 'marketing';

const AdminKnowledgeBasePage: React.FC<AdminKnowledgeBasePageProps> = ({ agentProfile: _agentProfile }) => {
    const [activeTab, setActiveTab] = useState<TabId>('agent');
    const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    
    // AI Personalities State
    const [aiSidekicks, setAiSidekicks] = useState({
        listing: { personality: 'professional', voice: 'female-1' },
        agent: { personality: 'friendly', voice: 'male-1' },
        helper: { personality: 'enthusiastic', voice: 'female-2' }
    });
    const [testInput, setTestInput] = useState('');
    const [testResults, setTestResults] = useState<{[key: string]: string}>({});
    const [isTesting, setIsTesting] = useState(false);

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        
        const files = Array.from(e.dataTransfer.files);
        const fileNames = files.map(file => file.name);
        setUploadedFiles(prev => [...prev, ...fileNames]);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const fileNames = files.map(file => file.name);
            setUploadedFiles(prev => [...prev, ...fileNames]);
        }
    };

    const handlePersonalityTest = async () => {
        if (!testInput.trim()) return;
        
        setIsTesting(true);
        const results: {[key: string]: string} = {};
        
        // Simulate AI responses for each personality
        const personalities = {
            listing: aiSidekicks.listing.personality,
            agent: aiSidekicks.agent.personality,
            helper: aiSidekicks.helper.personality
        };
        
        for (const [sidekick, personality] of Object.entries(personalities)) {
            const response = await generateText(`Respond to: "${testInput}" with a ${personality} personality. Keep it brief and natural.`);
            results[sidekick] = response;
        }
        
        setTestResults(results);
        setIsTesting(false);
    };

    const tabs: Array<{ id: TabId; label: string; icon: string }> = [
        { id: 'agent', label: 'Admin Agent Knowledge Base', icon: 'person' },
        { id: 'listing', label: 'Admin Listing Knowledge Base', icon: 'home' },
        { id: 'personalities', label: 'Admin AI Personalities', icon: 'psychology' },
        { id: 'conversations', label: 'Admin Chat Conversations', icon: 'chat' },
        { id: 'marketing', label: 'Admin Marketing Knowledge Base', icon: 'campaign' },
    ];

    return (
        <div className="bg-green-50 min-h-full">
            <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900">Admin Knowledge Base</h1>
                    <p className="text-slate-500 mt-1">Your personal AI assistant that learns from your expertise and feedback.</p>
                </header>

                {/* Tab Navigation */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
                    <div className="border-b border-slate-200 relative">
                        <div className="flex overflow-x-auto">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
                                        activeTab === tab.id
                                            ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                    <span className="material-symbols-outlined w-5 h-5">{tab.icon}</span>
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Tab Content */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    {activeTab === 'agent' && (
                        <div className="p-8">
                            <div className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-900 mb-2">Admin Agent Knowledge Base</h2>
                                <p className="text-slate-600">Upload documents, scripts, and materials that will help your AI understand your expertise and approach.</p>
                            </div>

                            {/* File Upload Area */}
                            <div
                                onDragEnter={handleDragEnter}
                                onDragLeave={handleDragLeave}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                                    isDragging ? 'border-primary-500 bg-primary-50' : 'border-slate-300'
                                }`}
                            >
                                <span className="material-symbols-outlined text-4xl text-slate-400 mb-4">cloud_upload</span>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">Upload Files</h3>
                                <p className="text-slate-600 mb-4">Drag and drop files here or click to browse</p>
                                <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg cursor-pointer hover:bg-primary-700 transition-colors">
                                    <span className="material-symbols-outlined">upload</span>
                                    Choose Files
                                    <input
                                        type="file"
                                        multiple
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                </label>
                            </div>

                            {/* Uploaded Files */}
                            {uploadedFiles.length > 0 && (
                                <div className="mt-8">
                                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Uploaded Files</h3>
                                    <div className="space-y-2">
                                        {uploadedFiles.map((fileName, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                                <span className="text-slate-700">{fileName}</span>
                                                <button
                                                    onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <span className="material-symbols-outlined">delete</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'listing' && (
                        <div className="p-8">
                            <div className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-900 mb-2">Admin Listing Knowledge Base</h2>
                                <p className="text-slate-600">Upload property-specific documents, inspection reports, and listing materials.</p>
                            </div>

                            {/* File Upload Area */}
                            <div
                                onDragEnter={handleDragEnter}
                                onDragLeave={handleDragLeave}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                                    isDragging ? 'border-primary-500 bg-primary-50' : 'border-slate-300'
                                }`}
                            >
                                <span className="material-symbols-outlined text-4xl text-slate-400 mb-4">home</span>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">Upload Listing Files</h3>
                                <p className="text-slate-600 mb-4">Drag and drop property documents here or click to browse</p>
                                <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg cursor-pointer hover:bg-primary-700 transition-colors">
                                    <span className="material-symbols-outlined">upload</span>
                                    Choose Files
                                    <input
                                        type="file"
                                        multiple
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                </label>
                            </div>
                        </div>
                    )}

                    {activeTab === 'personalities' && (
                        <div className="p-8">
                            <div className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-900 mb-2">Admin AI Personalities</h2>
                                <p className="text-slate-600">Customize the personality and voice of your AI assistants.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                {/* Listing AI */}
                                <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="material-symbols-outlined text-2xl text-slate-600">home</span>
                                        <h3 className="text-lg font-semibold text-slate-900">Listing AI</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Personality</label>
                                            <select
                                                value={aiSidekicks.listing.personality}
                                                onChange={(e) => setAiSidekicks(prev => ({
                                                    ...prev,
                                                    listing: { ...prev.listing, personality: e.target.value }
                                                }))}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            >
                                                <option value="professional">Professional</option>
                                                <option value="friendly">Friendly</option>
                                                <option value="enthusiastic">Enthusiastic</option>
                                                <option value="formal">Formal</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Voice</label>
                                            <select
                                                value={aiSidekicks.listing.voice}
                                                onChange={(e) => setAiSidekicks(prev => ({
                                                    ...prev,
                                                    listing: { ...prev.listing, voice: e.target.value }
                                                }))}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            >
                                                <option value="female-1">Female Voice 1</option>
                                                <option value="female-2">Female Voice 2</option>
                                                <option value="male-1">Male Voice 1</option>
                                                <option value="male-2">Male Voice 2</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Agent AI */}
                                <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="material-symbols-outlined text-2xl text-slate-600">person</span>
                                        <h3 className="text-lg font-semibold text-slate-900">Agent AI</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Personality</label>
                                            <select
                                                value={aiSidekicks.agent.personality}
                                                onChange={(e) => setAiSidekicks(prev => ({
                                                    ...prev,
                                                    agent: { ...prev.agent, personality: e.target.value }
                                                }))}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            >
                                                <option value="professional">Professional</option>
                                                <option value="friendly">Friendly</option>
                                                <option value="enthusiastic">Enthusiastic</option>
                                                <option value="formal">Formal</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Voice</label>
                                            <select
                                                value={aiSidekicks.agent.voice}
                                                onChange={(e) => setAiSidekicks(prev => ({
                                                    ...prev,
                                                    agent: { ...prev.agent, voice: e.target.value }
                                                }))}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            >
                                                <option value="female-1">Female Voice 1</option>
                                                <option value="female-2">Female Voice 2</option>
                                                <option value="male-1">Male Voice 1</option>
                                                <option value="male-2">Male Voice 2</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Helper AI */}
                                <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="material-symbols-outlined text-2xl text-slate-600">support_agent</span>
                                        <h3 className="text-lg font-semibold text-slate-900">Helper AI</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Personality</label>
                                            <select
                                                value={aiSidekicks.helper.personality}
                                                onChange={(e) => setAiSidekicks(prev => ({
                                                    ...prev,
                                                    helper: { ...prev.helper, personality: e.target.value }
                                                }))}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            >
                                                <option value="professional">Professional</option>
                                                <option value="friendly">Friendly</option>
                                                <option value="enthusiastic">Enthusiastic</option>
                                                <option value="formal">Formal</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Voice</label>
                                            <select
                                                value={aiSidekicks.helper.voice}
                                                onChange={(e) => setAiSidekicks(prev => ({
                                                    ...prev,
                                                    helper: { ...prev.helper, voice: e.target.value }
                                                }))}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            >
                                                <option value="female-1">Female Voice 1</option>
                                                <option value="female-2">Female Voice 2</option>
                                                <option value="male-1">Male Voice 1</option>
                                                <option value="male-2">Male Voice 2</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Personality Test */}
                            <div className="bg-slate-50 rounded-lg p-6">
                                <h3 className="text-lg font-semibold text-slate-900 mb-4">Test AI Personalities</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Test Input</label>
                                        <input
                                            type="text"
                                            value={testInput}
                                            onChange={(e) => setTestInput(e.target.value)}
                                            placeholder="Enter a test message..."
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>
                                    <button
                                        onClick={handlePersonalityTest}
                                        disabled={isTesting || !testInput.trim()}
                                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isTesting ? 'Testing...' : 'Test Personalities'}
                                    </button>
                                </div>

                                {/* Test Results */}
                                {Object.keys(testResults).length > 0 && (
                                    <div className="mt-6 space-y-4">
                                        <h4 className="font-semibold text-slate-900">Test Results:</h4>
                                        {Object.entries(testResults).map(([sidekick, response]) => (
                                            <div key={sidekick} className="bg-white rounded-lg p-4 border border-slate-200">
                                                <h5 className="font-medium text-slate-900 mb-2 capitalize">{sidekick} AI:</h5>
                                                <p className="text-slate-700">{response}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'conversations' && (
                        <div className="p-8">
                            <div className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-900 mb-2">Admin Chat Conversations</h2>
                                <p className="text-slate-600">Review and manage your AI chat conversations and training data.</p>
                            </div>
                            <div className="text-center text-slate-500">
                                <span className="material-symbols-outlined text-6xl mb-4">chat</span>
                                <p>Chat conversation management coming soon...</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'marketing' && (
                        <div className="p-8">
                            <div className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-900 mb-2">Admin Marketing Knowledge Base</h2>
                                <p className="text-slate-600">Upload marketing materials, campaigns, and promotional content.</p>
                            </div>

                            {/* File Upload Area */}
                            <div
                                onDragEnter={handleDragEnter}
                                onDragLeave={handleDragLeave}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                                    isDragging ? 'border-primary-500 bg-primary-50' : 'border-slate-300'
                                }`}
                            >
                                <span className="material-symbols-outlined text-4xl text-slate-400 mb-4">campaign</span>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">Upload Marketing Files</h3>
                                <p className="text-slate-600 mb-4">Drag and drop marketing materials here or click to browse</p>
                                <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg cursor-pointer hover:bg-primary-700 transition-colors">
                                    <span className="material-symbols-outlined">upload</span>
                                    Choose Files
                                    <input
                                        type="file"
                                        multiple
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                </label>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminKnowledgeBasePage;
