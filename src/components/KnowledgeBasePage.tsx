import React, { useState, useRef, useEffect } from 'react';
import { AgentProfile } from '../types';
import { generateText } from '../services/geminiService';

interface KnowledgeBasePageProps {
    agentProfile: AgentProfile;
}

const KnowledgeBasePage: React.FC<KnowledgeBasePageProps> = ({ agentProfile }) => {
    const [activeTab, setActiveTab] = useState<'agent' | 'listing' | 'personalities' | 'conversations' | 'marketing'>('agent');
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

    const tabs = [
        { id: 'agent', label: 'Agent Knowledge Base', icon: 'person' },
        { id: 'listing', label: 'Listing Knowledge Base', icon: 'home' },
        { id: 'personalities', label: 'AI Personalities', icon: 'psychology' },
        { id: 'conversations', label: 'Chat Conversations', icon: 'chat' },
        { id: 'marketing', label: 'Marketing Knowledge Base', icon: 'campaign' },
    ];

    return (
        <div className="bg-slate-50 min-h-full">
            <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900">Knowledge Base</h1>
                    <p className="text-slate-500 mt-1">Your personal AI assistant that learns from your expertise and feedback.</p>
                </header>

                {/* Tab Navigation */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
                    <div className="border-b border-slate-200 relative">
                        {/* Scroll Indicators */}
                        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
                        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>
                        
                        {/* Scroll Buttons */}
                        <button 
                            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all shadow-sm"
                            onClick={() => {
                                const nav = document.querySelector('.tab-nav');
                                if (nav) nav.scrollBy({ left: -200, behavior: 'smooth' });
                            }}
                        >
                            <span className="material-symbols-outlined text-sm">chevron_left</span>
                        </button>
                        
                        <button 
                            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all shadow-sm"
                            onClick={() => {
                                const nav = document.querySelector('.tab-nav');
                                if (nav) nav.scrollBy({ left: 200, behavior: 'smooth' });
                            }}
                        >
                            <span className="material-symbols-outlined text-sm">chevron_right</span>
                        </button>
                        
                        <nav className="tab-nav flex overflow-x-auto custom-scrollbar">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
                                        activeTab === tab.id
                                            ? 'border-primary-500 text-primary-600 bg-primary-50'
                                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                    <span className="material-symbols-outlined w-5 h-5">{tab.icon}</span>
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                        

                    </div>
                </div>

                {/* Tab Content */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    {activeTab === 'agent' && (
                        <div>
                            <div className="mb-6">
                                <h2 className="text-xl font-bold text-slate-900 mb-2">🤖 Agent Knowledge Base</h2>
                                <p className="text-slate-600">
                                    Upload documents, scripts, and materials that will help your AI understand your expertise and approach.
                                </p>
                            </div>

                            {/* File Upload Area */}
                            <div 
                                onDragEnter={handleDragEnter}
                                onDragLeave={handleDragLeave}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                className={`relative p-12 text-center bg-slate-50 rounded-xl border-2 border-dashed transition-colors ${
                                    isDragging ? 'border-primary-500 bg-primary-50' : 'border-slate-300'
                                }`}
                            >
                                <div className="flex flex-col items-center justify-center">
                                    <span className="material-symbols-outlined text-6xl text-slate-400 mb-4">upload</span>
                                    <h3 className="text-xl font-bold text-slate-800 mb-2">Upload Agent Files</h3>
                                    <p className="text-slate-500 mb-6">Drag and drop files here, or click to browse</p>
                                    <label htmlFor="agent-file-upload" className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg shadow-sm hover:bg-primary-700 transition cursor-pointer">
                                        <span className="material-symbols-outlined w-5 h-5">upload</span>
                                        Choose Files
                                    </label>
                                    <input id="agent-file-upload" type="file" multiple className="hidden" onChange={handleFileChange} />
                                </div>
                            </div>

                            {/* Uploaded Files */}
                            {uploadedFiles.length > 0 && (
                                <div className="mt-6">
                                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Uploaded Files</h3>
                                    <div className="space-y-2">
                                        {uploadedFiles.map((file, index) => (
                                            <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                                <span className="material-symbols-outlined text-slate-400">description</span>
                                                <span className="flex-1 text-slate-700">{file}</span>
                                                <button 
                                                    onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <span className="material-symbols-outlined w-5 h-5">delete</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {uploadedFiles.length === 0 && (
                                <div className="mt-6 text-center py-8">
                                    <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">description</span>
                                    <p className="text-slate-500">No files uploaded yet. Upload documents to train your AI assistant.</p>
                                </div>
                            )}

                            {/* Quick Actions */}
                            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 border border-slate-200 rounded-lg">
                                    <h4 className="font-semibold text-slate-900 mb-2">📝 Add Text Knowledge</h4>
                                    <p className="text-sm text-slate-600 mb-3">Manually add text snippets or Q&A.</p>
                                    <button className="w-full px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition">
                                        Add Text
                                    </button>
                                </div>
                                <div className="p-4 border border-slate-200 rounded-lg">
                                    <h4 className="font-semibold text-slate-900 mb-2">🌐 URL Scraper</h4>
                                    <p className="text-sm text-slate-600 mb-3">Add a webpage for the AI to learn from.</p>
                                    <button className="w-full px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition">
                                        Add Scraper
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'listing' && (
                        <div>
                            <div className="mb-6">
                                <h2 className="text-xl font-bold text-slate-900 mb-2">🏠 Listing Knowledge Base</h2>
                                <p className="text-slate-600">
                                    Upload property listings, market data, and materials that will help your AI understand specific properties and market conditions.
                                </p>
                            </div>

                            {/* File Upload Area */}
                            <div 
                                onDragEnter={handleDragEnter}
                                onDragLeave={handleDragLeave}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                className={`relative p-12 text-center bg-slate-50 rounded-xl border-2 border-dashed transition-colors ${
                                    isDragging ? 'border-primary-500 bg-primary-50' : 'border-slate-300'
                                }`}
                            >
                                <div className="flex flex-col items-center justify-center">
                                    <span className="material-symbols-outlined text-6xl text-slate-400 mb-4">upload</span>
                                    <h3 className="text-xl font-bold text-slate-800 mb-2">Upload Listing Files</h3>
                                    <p className="text-slate-500 mb-6">Drag and drop property files here, or click to browse</p>
                                    <label htmlFor="listing-file-upload" className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg shadow-sm hover:bg-primary-700 transition cursor-pointer">
                                        <span className="material-symbols-outlined w-5 h-5">upload</span>
                                        Choose Files
                                    </label>
                                    <input id="listing-file-upload" type="file" multiple className="hidden" onChange={handleFileChange} />
                                </div>
                            </div>

                            {/* Uploaded Files */}
                            {uploadedFiles.length > 0 && (
                                <div className="mt-6">
                                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Uploaded Files</h3>
                                    <div className="space-y-2">
                                        {uploadedFiles.map((file, index) => (
                                            <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                                <span className="material-symbols-outlined text-slate-400">description</span>
                                                <span className="flex-1 text-slate-700">{file}</span>
                                                <button 
                                                    onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <span className="material-symbols-outlined w-5 h-5">delete</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {uploadedFiles.length === 0 && (
                                <div className="mt-6 text-center py-8">
                                    <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">description</span>
                                    <p className="text-slate-500">No listing files uploaded yet. Upload property documents to train your AI assistant.</p>
                                </div>
                            )}

                            {/* Quick Actions */}
                            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 border border-slate-200 rounded-lg">
                                    <h4 className="font-semibold text-slate-900 mb-2">📝 Add Property Details</h4>
                                    <p className="text-sm text-slate-600 mb-3">Manually add property information and descriptions.</p>
                                    <button className="w-full px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition">
                                        Add Details
                                    </button>
                                </div>
                                <div className="p-4 border border-slate-200 rounded-lg">
                                    <h4 className="font-semibold text-slate-900 mb-2">🌐 Market Data Scraper</h4>
                                    <p className="text-sm text-slate-600 mb-3">Add market data and property listings from websites.</p>
                                    <button className="w-full px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition">
                                        Add Market Data
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'personalities' && (
                        <div>
                            <div className="mb-6">
                                <h2 className="text-xl font-bold text-slate-900 mb-2">🎭 AI Personalities</h2>
                                <p className="text-slate-600">
                                    Configure your three AI sidekicks with different personalities and voices for various scenarios.
                                </p>
                            </div>

                            {/* AI Sidekicks Configuration */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                                {/* Listing Sidekick */}
                                <div className="p-6 border border-slate-200 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                                            <span className="material-symbols-outlined text-white">home</span>
                                        </div>
                                        <h3 className="font-bold text-slate-900">Listing Sidekick</h3>
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
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            >
                                                <option value="professional">Professional</option>
                                                <option value="friendly">Friendly</option>
                                                <option value="enthusiastic">Enthusiastic</option>
                                                <option value="calm">Calm</option>
                                                <option value="casual">Casual</option>
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
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            >
                                                <option value="female-1">Female Voice 1</option>
                                                <option value="female-2">Female Voice 2</option>
                                                <option value="male-1">Male Voice 1</option>
                                                <option value="male-2">Male Voice 2</option>
                                                <option value="neutral-1">Neutral Voice 1</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Agent Sidekick */}
                                <div className="p-6 border border-slate-200 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                                            <span className="material-symbols-outlined text-white">person</span>
                                        </div>
                                        <h3 className="font-bold text-slate-900">Agent Sidekick</h3>
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
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                            >
                                                <option value="professional">Professional</option>
                                                <option value="friendly">Friendly</option>
                                                <option value="enthusiastic">Enthusiastic</option>
                                                <option value="calm">Calm</option>
                                                <option value="casual">Casual</option>
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
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                            >
                                                <option value="female-1">Female Voice 1</option>
                                                <option value="female-2">Female Voice 2</option>
                                                <option value="male-1">Male Voice 1</option>
                                                <option value="male-2">Male Voice 2</option>
                                                <option value="neutral-1">Neutral Voice 1</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Helper Sidekick */}
                                <div className="p-6 border border-slate-200 rounded-xl bg-gradient-to-br from-purple-50 to-violet-50">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                                            <span className="material-symbols-outlined text-white">support_agent</span>
                                        </div>
                                        <h3 className="font-bold text-slate-900">Helper Sidekick</h3>
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
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                            >
                                                <option value="professional">Professional</option>
                                                <option value="friendly">Friendly</option>
                                                <option value="enthusiastic">Enthusiastic</option>
                                                <option value="calm">Calm</option>
                                                <option value="casual">Casual</option>
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
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                            >
                                                <option value="female-1">Female Voice 1</option>
                                                <option value="female-2">Female Voice 2</option>
                                                <option value="male-1">Male Voice 1</option>
                                                <option value="male-2">Male Voice 2</option>
                                                <option value="neutral-1">Neutral Voice 1</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Personality Testing */}
                            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                                <h3 className="text-lg font-bold text-slate-900 mb-4">🧪 Test Personalities</h3>
                                <p className="text-slate-600 mb-4">Enter a question or statement to see how each AI sidekick would respond with their configured personality.</p>
                                
                                <div className="flex gap-4 mb-4">
                                    <input
                                        type="text"
                                        value={testInput}
                                        onChange={(e) => setTestInput(e.target.value)}
                                        placeholder="Enter a question or statement to test..."
                                        className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    />
                                    <button
                                        onClick={handlePersonalityTest}
                                        disabled={!testInput.trim() || isTesting}
                                        className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
                                    >
                                        {isTesting ? 'Testing...' : 'Test Responses'}
                                    </button>
                                </div>

                                {/* Test Results */}
                                {Object.keys(testResults).length > 0 && (
                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-slate-900">Test Results:</h4>
                                        {Object.entries(testResults).map(([sidekick, response]) => (
                                            <div key={sidekick} className="p-4 bg-white rounded-lg border border-slate-200">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="font-semibold text-slate-900 capitalize">{sidekick} Sidekick:</span>
                                                    <span className="text-sm text-slate-500">({aiSidekicks[sidekick as keyof typeof aiSidekicks].personality} personality)</span>
                                                </div>
                                                <p className="text-slate-700">{response}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Voice Sampling */}
                            <div className="mt-6 bg-slate-50 rounded-xl p-6 border border-slate-200">
                                <h3 className="text-lg font-bold text-slate-900 mb-4">🎵 Sample Voices</h3>
                                <p className="text-slate-600 mb-4">Listen to samples of different voice options to choose the perfect one for each sidekick.</p>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {['Female Voice 1', 'Female Voice 2', 'Male Voice 1', 'Male Voice 2', 'Neutral Voice 1'].map((voice) => (
                                        <div key={voice} className="p-4 bg-white rounded-lg border border-slate-200">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-medium text-slate-900">{voice}</span>
                                                <button className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition">
                                                    <span className="material-symbols-outlined">play_arrow</span>
                                                </button>
                                            </div>
                                            <div className="text-xs text-slate-500">Click to hear sample</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'conversations' && (
                        <div>
                            <div className="mb-6">
                                <h2 className="text-xl font-bold text-slate-900 mb-2">💬 Chat Conversations</h2>
                                <p className="text-slate-600">
                                    Review and manage your chat history. These conversations help train your AI assistant and become part of your knowledge base.
                                </p>
                            </div>

                            {/* Conversation Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-blue-600">chat</span>
                                        <div>
                                            <p className="text-sm text-blue-600">Total Conversations</p>
                                            <p className="text-xl font-bold text-blue-900">24</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-green-600">message</span>
                                        <div>
                                            <p className="text-sm text-green-600">Messages Today</p>
                                            <p className="text-xl font-bold text-green-900">12</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-purple-600">thumb_up</span>
                                        <div>
                                            <p className="text-sm text-purple-600">Helpful Responses</p>
                                            <p className="text-xl font-bold text-purple-900">89%</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-orange-600">schedule</span>
                                        <div>
                                            <p className="text-sm text-orange-600">Last Chat</p>
                                            <p className="text-xl font-bold text-orange-900">2h ago</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Conversations */}
                            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                                <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Conversations</h3>
                                
                                <div className="space-y-4">
                                    {/* Sample Conversation 1 */}
                                    <div className="bg-white rounded-lg border border-slate-200 p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-white text-sm">person</span>
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-slate-900">Property Valuation Discussion</h4>
                                                    <p className="text-sm text-slate-500">2 hours ago • 8 messages</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Helpful</span>
                                                <button className="p-1 text-slate-400 hover:text-slate-600">
                                                    <span className="material-symbols-outlined text-sm">more_vert</span>
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-600">"How do I determine the right listing price for a 3-bedroom house in the current market?"</p>
                                    </div>

                                    {/* Sample Conversation 2 */}
                                    <div className="bg-white rounded-lg border border-slate-200 p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-white text-sm">person</span>
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-slate-900">Marketing Strategy Help</h4>
                                                    <p className="text-sm text-slate-500">1 day ago • 15 messages</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Learning</span>
                                                <button className="p-1 text-slate-400 hover:text-slate-600">
                                                    <span className="material-symbols-outlined text-sm">more_vert</span>
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-600">"What are the best marketing strategies for luxury properties in this area?"</p>
                                    </div>

                                    {/* Sample Conversation 3 */}
                                    <div className="bg-white rounded-lg border border-slate-200 p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-white text-sm">person</span>
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-slate-900">Lead Follow-up Questions</h4>
                                                    <p className="text-sm text-slate-500">3 days ago • 6 messages</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Helpful</span>
                                                <button className="p-1 text-slate-400 hover:text-slate-600">
                                                    <span className="material-symbols-outlined text-sm">more_vert</span>
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-600">"What's the best way to follow up with a lead who viewed a property last week?"</p>
                                    </div>
                                </div>

                                {/* View All Button */}
                                <div className="mt-6 text-center">
                                    <button className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                                        View All Conversations
                                    </button>
                                </div>
                            </div>

                            {/* Conversation Management */}
                            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 border border-slate-200 rounded-lg">
                                    <h4 className="font-semibold text-slate-900 mb-2">📊 Conversation Analytics</h4>
                                    <p className="text-sm text-slate-600 mb-3">Analyze your chat patterns and AI performance.</p>
                                    <button className="w-full px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition">
                                        View Analytics
                                    </button>
                                </div>
                                <div className="p-4 border border-slate-200 rounded-lg">
                                    <h4 className="font-semibold text-slate-900 mb-2">🗂️ Export Conversations</h4>
                                    <p className="text-sm text-slate-600 mb-3">Export your chat history for backup or analysis.</p>
                                    <button className="w-full px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition">
                                        Export Data
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'marketing' && (
                        <div>
                            <div className="mb-6">
                                <h2 className="text-xl font-bold text-slate-900 mb-2">📈 Marketing Knowledge Base</h2>
                                <p className="text-slate-600">
                                    Upload marketing materials, campaigns, and content that will help your AI understand your marketing strategies and brand voice.
                                </p>
                            </div>

                            {/* File Upload Area */}
                            <div 
                                onDragEnter={handleDragEnter}
                                onDragLeave={handleDragLeave}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                className={`relative p-12 text-center bg-slate-50 rounded-xl border-2 border-dashed transition-colors ${
                                    isDragging ? 'border-primary-500 bg-primary-50' : 'border-slate-300'
                                }`}
                            >
                                <div className="flex flex-col items-center justify-center">
                                    <span className="material-symbols-outlined text-6xl text-slate-400 mb-4">upload</span>
                                    <h3 className="text-xl font-bold text-slate-800 mb-2">Upload Marketing Files</h3>
                                    <p className="text-slate-500 mb-6">Drag and drop marketing materials here, or click to browse</p>
                                    <label htmlFor="marketing-file-upload" className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg shadow-sm hover:bg-primary-700 transition cursor-pointer">
                                        <span className="material-symbols-outlined w-5 h-5">upload</span>
                                        Choose Files
                                    </label>
                                    <input id="marketing-file-upload" type="file" multiple className="hidden" onChange={handleFileChange} />
                                </div>
                            </div>

                            {/* Uploaded Files */}
                            {uploadedFiles.length > 0 && (
                                <div className="mt-6">
                                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Uploaded Files</h3>
                                    <div className="space-y-2">
                                        {uploadedFiles.map((file, index) => (
                                            <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                                <span className="material-symbols-outlined text-slate-400">description</span>
                                                <span className="flex-1 text-slate-700">{file}</span>
                                                <button 
                                                    onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <span className="material-symbols-outlined w-5 h-5">delete</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {uploadedFiles.length === 0 && (
                                <div className="mt-6 text-center py-8">
                                    <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">description</span>
                                    <p className="text-slate-500">No marketing files uploaded yet. Upload marketing materials to train your AI assistant.</p>
                                </div>
                            )}

                            {/* Quick Actions */}
                            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 border border-slate-200 rounded-lg">
                                    <h4 className="font-semibold text-slate-900 mb-2">📝 Add Marketing Content</h4>
                                    <p className="text-sm text-slate-600 mb-3">Manually add marketing copy, campaigns, and strategies.</p>
                                    <button className="w-full px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition">
                                        Add Content
                                    </button>
                                </div>
                                <div className="p-4 border border-slate-200 rounded-lg">
                                    <h4 className="font-semibold text-slate-900 mb-2">🌐 Campaign Scraper</h4>
                                    <p className="text-sm text-slate-600 mb-3">Add marketing campaigns and content from websites.</p>
                                    <button className="w-full px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition">
                                        Add Campaigns
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default KnowledgeBasePage;