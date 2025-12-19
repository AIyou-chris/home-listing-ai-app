import React, { useState, useEffect } from 'react';
import { AgentProfile } from '../types';
import { generateText } from '../services/geminiService';
import { supabase } from '../services/supabase';
import { listKb, uploadFileKb, deleteKb, addTextKb, addUrlKb, type KbEntry, type SidekickId } from '../services/supabaseKb';
import { scrapeWebsite } from '../services/scraperService';

interface AdminKnowledgeBasePageProps {
    agentProfile: AgentProfile;
}

type TabId = 'agent' | 'listing' | 'personalities' | 'conversations' | 'marketing';

const AdminKnowledgeBasePage: React.FC<AdminKnowledgeBasePageProps> = ({ agentProfile: _agentProfile }) => {
    const [activeTab, setActiveTab] = useState<TabId>('agent');
    const [uploadedFiles, setUploadedFiles] = useState<KbEntry[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    // Knowledge Base Input State
    const [knowledgeTitle, setKnowledgeTitle] = useState('');
    const [knowledgeContent, setKnowledgeContent] = useState('');
    const [websiteUrl, setWebsiteUrl] = useState('');
    const [scrapingFrequency, setScrapingFrequency] = useState('once');
    const [isAddingKnowledge, setIsAddingKnowledge] = useState(false);
    const [isScraping, setIsScraping] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // AI Personalities State
    const [aiSidekicks, setAiSidekicks] = useState({
        listing: { personality: 'professional', voice: 'female-1' },
        agent: { personality: 'friendly', voice: 'male-1' },
        helper: { personality: 'enthusiastic', voice: 'female-2' }
    });
    const [testInput, setTestInput] = useState('');
    const [testResults, setTestResults] = useState<{ [key: string]: string }>({});
    const [isTesting, setIsTesting] = useState(false);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data?.user?.id) {
                setUserId(data.user.id);
                loadKb(data.user.id);
            }
        });
    }, []);

    const loadKb = async (uid: string) => {
        try {
            // Load all knowledge base entries for the user
            const entries = await listKb(uid);
            setUploadedFiles(entries);
        } catch (error) {
            console.error('Error loading knowledge base:', error);
        }
    };

    const getSidekickIdForTab = (tab: TabId): SidekickId => {
        switch (tab) {
            case 'agent': return 'agent';
            case 'listing': return 'listing';
            case 'marketing': return 'marketing';
            default: return 'main';
        }
    };

    const handleFileUpload = async (files: File[]) => {
        if (!userId) {
            alert('Please sign in to upload files.');
            return;
        }

        setIsUploading(true);
        const sidekickId = getSidekickIdForTab(activeTab);

        try {
            for (const file of files) {
                await uploadFileKb(userId, sidekickId, file);
            }
            await loadKb(userId);
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Failed to upload file. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteFile = async (entry: KbEntry) => {
        try {
            await deleteKb(entry);
            setUploadedFiles(prev => prev.filter(f => f.id !== entry.id));
        } catch (error) {
            console.error('Delete failed:', error);
            alert('Failed to delete file.');
        }
    };

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

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        await handleFileUpload(files);
    };

    const handleAddTextKnowledge = async () => {
        if (!userId || !knowledgeTitle.trim() || !knowledgeContent.trim()) return;

        setIsAddingKnowledge(true);
        const sidekickId = getSidekickIdForTab(activeTab);

        try {
            await addTextKb(userId, sidekickId, knowledgeTitle.trim(), knowledgeContent.trim());
            await loadKb(userId);
            setKnowledgeTitle('');
            setKnowledgeContent('');
        } catch (error) {
            console.error('Failed to add text knowledge:', error);
            alert('Failed to add knowledge.');
        } finally {
            setIsAddingKnowledge(false);
        }
    };

    const handleUrlScraping = async () => {
        if (!userId || !websiteUrl.trim()) return;

        setIsScraping(true);
        const sidekickId = getSidekickIdForTab(activeTab);

        try {
            const trimmedUrl = websiteUrl.trim();
            let title = trimmedUrl;
            let content = "";

            try {
                const scrapedData = await scrapeWebsite(trimmedUrl);
                title = scrapedData.title;
                content = scrapedData.content;
            } catch (scrapeError) {
                console.warn("Scraping failed, falling back to storing URL only", scrapeError);
                // We'll proceed with empty content, so it just stores the URL reference
            }

            await addUrlKb(userId, sidekickId, title, trimmedUrl, content);
            await loadKb(userId);
            setWebsiteUrl('');
        } catch (error) {
            console.error('Failed to add URL:', error);
            alert('Failed to save URL.');
        } finally {
            setIsScraping(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            await handleFileUpload(files);
        }
    };

    const handlePersonalityTest = async () => {
        if (!testInput.trim()) return;

        setIsTesting(true);
        const results: { [key: string]: string } = {};

        // Simulate AI responses for each personality
        const personalities = {
            listing: aiSidekicks.listing.personality,
            agent: aiSidekicks.agent.personality,
            helper: aiSidekicks.helper.personality
        };

        for (const [sidekick, personality] of Object.entries(personalities)) {
            // Map generic sidekick keys to specific knowledge base sidekick IDs if needed
            // 'helper' could map to 'marketing' or 'support' depending on your setup.
            // For now we check for direct matches or fallback to 'marketing' for helper.
            const kbSidekickId = sidekick === 'helper' ? 'marketing' : sidekick;

            const relevantEntries = uploadedFiles.filter(f => f.sidekick === kbSidekickId);

            let context = "";
            if (relevantEntries.length > 0) {
                const summaries = relevantEntries.map(e => {
                    if (e.type === 'file') return `Document: ${e.title}`;
                    // Truncate content to avoid huge prompts
                    const contentPreview = e.content ? e.content.substring(0, 300) + (e.content.length > 300 ? '...' : '') : '';
                    if (e.type === 'url') return `Webpage: ${e.title}\nContent: ${contentPreview}`;
                    if (e.type === 'text') return `Note: ${e.title}\nContent: ${contentPreview}`;
                    return `Entry: ${e.title}`;
                });
                context = `[Knowledge Base Context:\n${summaries.join('\n\n')}\n] `;
            }

            const response = await generateText(`Respond to: "${testInput}" with a ${personality} personality. ${context}Keep it brief and natural.`);
            results[sidekick] = response;
        }

        setTestResults(results);
        setIsTesting(false);
    };

    const filterFiles = (sidekickId: SidekickId) => {
        return uploadedFiles.filter(f =>
            f.sidekick === sidekickId &&
            (searchTerm === '' ||
                f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (f.content && f.content.toLowerCase().includes(searchTerm.toLowerCase())))
        );
    };



    const SearchBar = () => (
        <div className="mb-4">
            <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                <input
                    type="text"
                    placeholder="Search knowledge base..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
            </div>
        </div>
    );

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
                                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id
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
                                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging ? 'border-primary-500 bg-primary-50' : 'border-slate-300'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-4xl text-slate-400 mb-4">cloud_upload</span>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">Upload Files</h3>
                                <p className="text-slate-600 mb-4">Drag and drop files here or click to browse</p>
                                <label className={`inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg cursor-pointer hover:bg-primary-700 transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    <span className="material-symbols-outlined max-w-[24px]">upload</span>
                                    {isUploading ? 'Uploading...' : 'Choose Files'}
                                    <input
                                        type="file"
                                        multiple
                                        className="hidden"
                                        onChange={handleFileChange}
                                        disabled={isUploading}
                                    />
                                </label>
                            </div>

                            {/* Two Column Layout for Text and URL */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                                {/* Add Text Knowledge */}
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="material-symbols-outlined text-orange-600">edit_note</span>
                                        <h4 className="text-lg font-semibold text-orange-900">Add Text Knowledge</h4>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-orange-800 mb-2">Title</label>
                                            <input
                                                type="text"
                                                value={knowledgeTitle}
                                                onChange={(e) => setKnowledgeTitle(e.target.value)}
                                                placeholder="e.g., Sales Script, FAQ..."
                                                className="w-full px-3 py-2 border border-orange-300 rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-orange-800 mb-2">Content</label>
                                            <textarea
                                                value={knowledgeContent}
                                                onChange={(e) => setKnowledgeContent(e.target.value)}
                                                placeholder="Enter knowledge content..."
                                                rows={4}
                                                className="w-full px-3 py-2 border border-orange-300 rounded-lg"
                                            />
                                        </div>
                                        <button
                                            onClick={handleAddTextKnowledge}
                                            disabled={isAddingKnowledge || !knowledgeTitle.trim() || !knowledgeContent.trim()}
                                            className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                                        >
                                            {isAddingKnowledge ? 'Adding...' : 'Add Knowledge'}
                                        </button>
                                    </div>
                                </div>

                                {/* URL Scraper */}
                                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="material-symbols-outlined text-green-600">language</span>
                                        <h4 className="text-lg font-semibold text-green-900">URL Scraper</h4>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-green-800 mb-2">Website URL</label>
                                            <input
                                                type="url"
                                                value={websiteUrl}
                                                onChange={(e) => setWebsiteUrl(e.target.value)}
                                                placeholder="https://example.com"
                                                className="w-full px-3 py-2 border border-green-300 rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-green-800 mb-2">Frequency</label>
                                            <select
                                                value={scrapingFrequency}
                                                onChange={(e) => setScrapingFrequency(e.target.value)}
                                                className="w-full px-3 py-2 border border-green-300 rounded-lg"
                                            >
                                                <option value="once">Once</option>
                                                <option value="daily">Daily</option>
                                                <option value="weekly">Weekly</option>
                                            </select>
                                        </div>
                                        <button
                                            onClick={handleUrlScraping}
                                            disabled={isScraping || !websiteUrl.trim()}
                                            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {isScraping ? (
                                                <>
                                                    <span className="material-symbols-outlined animate-spin text-lg">refresh</span>
                                                    Scraping...
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined text-lg">download</span>
                                                    Scrape Website
                                                </>
                                            )}
                                        </button>
                                        {websiteUrl === '' && !isScraping && (
                                            <p className="text-xs text-green-700 font-medium text-center animate-pulse">
                                                Ready to scrape next URL
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Uploaded Files */}
                            {uploadedFiles.some(f => f.sidekick === 'agent') && (
                                <div className="mt-8">
                                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Uploaded Files</h3>
                                    <SearchBar />
                                    <div className="space-y-2">
                                        {filterFiles('agent').map((file) => (
                                            <div key={file.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <span className="material-symbols-outlined text-slate-400">
                                                        {file.type === 'file' ? 'description' : file.type === 'url' ? 'link' : 'article'}
                                                    </span>
                                                    <div>
                                                        <span className="text-slate-700 font-medium block">{file.title}</span>
                                                        {file.type !== 'file' && file.content && (
                                                            <span className="text-slate-500 text-xs block truncate max-w-xs">{file.content}</span>
                                                        )}
                                                        <span className="text-slate-400 text-xs">{new Date(file.created_at).toLocaleDateString()} • {file.type.toUpperCase()}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteFile(file)}
                                                    className="text-red-500 hover:text-red-700"
                                                    title="Delete"
                                                >
                                                    <span className="material-symbols-outlined">delete</span>
                                                </button>
                                            </div>
                                        ))}
                                        {filterFiles('agent').length === 0 && (
                                            <p className="text-slate-500 text-center py-4">No matching knowledge found.</p>
                                        )}
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
                                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging ? 'border-primary-500 bg-primary-50' : 'border-slate-300'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-4xl text-slate-400 mb-4">home</span>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">Upload Listing Files</h3>
                                <p className="text-slate-600 mb-4">Drag and drop property documents here or click to browse</p>
                                <label className={`inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg cursor-pointer hover:bg-primary-700 transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    <span className="material-symbols-outlined max-w-[24px]">upload</span>
                                    {isUploading ? 'Uploading...' : 'Choose Files'}
                                    <input
                                        type="file"
                                        multiple
                                        className="hidden"
                                        onChange={handleFileChange}
                                        disabled={isUploading}
                                    />
                                </label>
                            </div>

                            {/* Two Column Layout for Text and URL */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                                {/* Add Text Knowledge */}
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="material-symbols-outlined text-orange-600">edit_note</span>
                                        <h4 className="text-lg font-semibold text-orange-900">Add Text Knowledge</h4>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-orange-800 mb-2">Title</label>
                                            <input
                                                type="text"
                                                value={knowledgeTitle}
                                                onChange={(e) => setKnowledgeTitle(e.target.value)}
                                                placeholder="e.g., Sales Script, FAQ..."
                                                className="w-full px-3 py-2 border border-orange-300 rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-orange-800 mb-2">Content</label>
                                            <textarea
                                                value={knowledgeContent}
                                                onChange={(e) => setKnowledgeContent(e.target.value)}
                                                placeholder="Enter knowledge content..."
                                                rows={4}
                                                className="w-full px-3 py-2 border border-orange-300 rounded-lg"
                                            />
                                        </div>
                                        <button
                                            onClick={handleAddTextKnowledge}
                                            disabled={isAddingKnowledge || !knowledgeTitle.trim() || !knowledgeContent.trim()}
                                            className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                                        >
                                            {isAddingKnowledge ? 'Adding...' : 'Add Knowledge'}
                                        </button>
                                    </div>
                                </div>

                                {/* URL Scraper */}
                                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="material-symbols-outlined text-green-600">language</span>
                                        <h4 className="text-lg font-semibold text-green-900">URL Scraper</h4>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-green-800 mb-2">Website URL</label>
                                            <input
                                                type="url"
                                                value={websiteUrl}
                                                onChange={(e) => setWebsiteUrl(e.target.value)}
                                                placeholder="https://example.com"
                                                className="w-full px-3 py-2 border border-green-300 rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-green-800 mb-2">Frequency</label>
                                            <select
                                                value={scrapingFrequency}
                                                onChange={(e) => setScrapingFrequency(e.target.value)}
                                                className="w-full px-3 py-2 border border-green-300 rounded-lg"
                                            >
                                                <option value="once">Once</option>
                                                <option value="daily">Daily</option>
                                                <option value="weekly">Weekly</option>
                                            </select>
                                        </div>
                                        <button
                                            onClick={handleUrlScraping}
                                            disabled={isScraping || !websiteUrl.trim()}
                                            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                        >
                                            {isScraping ? 'Scraping...' : 'Scrape Website'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Uploaded Files */}
                            {uploadedFiles.some(f => f.sidekick === 'listing') && (
                                <div className="mt-8">
                                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Uploaded Files</h3>
                                    <SearchBar />
                                    <div className="space-y-2">
                                        {filterFiles('listing').map((file) => (
                                            <div key={file.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <span className="material-symbols-outlined text-slate-400">
                                                        {file.type === 'file' ? 'description' : file.type === 'url' ? 'link' : 'article'}
                                                    </span>
                                                    <div>
                                                        <span className="text-slate-700 font-medium block">{file.title}</span>
                                                        {file.type !== 'file' && file.content && (
                                                            <span className="text-slate-500 text-xs block truncate max-w-xs">{file.content}</span>
                                                        )}
                                                        <span className="text-slate-400 text-xs">{new Date(file.created_at).toLocaleDateString()} • {file.type.toUpperCase()}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteFile(file)}
                                                    className="text-red-500 hover:text-red-700"
                                                    title="Delete"
                                                >
                                                    <span className="material-symbols-outlined">delete</span>
                                                </button>
                                            </div>
                                        ))}
                                        {filterFiles('listing').length === 0 && (
                                            <p className="text-slate-500 text-center py-4">No matching knowledge found.</p>
                                        )}
                                    </div>
                                </div>
                            )}
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
                                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging ? 'border-primary-500 bg-primary-50' : 'border-slate-300'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-4xl text-slate-400 mb-4">campaign</span>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">Upload Marketing Files</h3>
                                <p className="text-slate-600 mb-4">Drag and drop marketing materials here or click to browse</p>
                                <label className={`inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg cursor-pointer hover:bg-primary-700 transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    <span className="material-symbols-outlined max-w-[24px]">upload</span>
                                    {isUploading ? 'Uploading...' : 'Choose Files'}
                                    <input
                                        type="file"
                                        multiple
                                        className="hidden"
                                        onChange={handleFileChange}
                                        disabled={isUploading}
                                    />
                                </label>
                            </div>

                            {/* Two Column Layout for Text and URL */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                                {/* Add Text Knowledge */}
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="material-symbols-outlined text-orange-600">edit_note</span>
                                        <h4 className="text-lg font-semibold text-orange-900">Add Text Knowledge</h4>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-orange-800 mb-2">Title</label>
                                            <input
                                                type="text"
                                                value={knowledgeTitle}
                                                onChange={(e) => setKnowledgeTitle(e.target.value)}
                                                placeholder="e.g., Sales Script, FAQ..."
                                                className="w-full px-3 py-2 border border-orange-300 rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-orange-800 mb-2">Content</label>
                                            <textarea
                                                value={knowledgeContent}
                                                onChange={(e) => setKnowledgeContent(e.target.value)}
                                                placeholder="Enter knowledge content..."
                                                rows={4}
                                                className="w-full px-3 py-2 border border-orange-300 rounded-lg"
                                            />
                                        </div>
                                        <button
                                            onClick={handleAddTextKnowledge}
                                            disabled={isAddingKnowledge || !knowledgeTitle.trim() || !knowledgeContent.trim()}
                                            className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                                        >
                                            {isAddingKnowledge ? 'Adding...' : 'Add Knowledge'}
                                        </button>
                                    </div>
                                </div>

                                {/* URL Scraper */}
                                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="material-symbols-outlined text-green-600">language</span>
                                        <h4 className="text-lg font-semibold text-green-900">URL Scraper</h4>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-green-800 mb-2">Website URL</label>
                                            <input
                                                type="url"
                                                value={websiteUrl}
                                                onChange={(e) => setWebsiteUrl(e.target.value)}
                                                placeholder="https://example.com"
                                                className="w-full px-3 py-2 border border-green-300 rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-green-800 mb-2">Frequency</label>
                                            <select
                                                value={scrapingFrequency}
                                                onChange={(e) => setScrapingFrequency(e.target.value)}
                                                className="w-full px-3 py-2 border border-green-300 rounded-lg"
                                            >
                                                <option value="once">Once</option>
                                                <option value="daily">Daily</option>
                                                <option value="weekly">Weekly</option>
                                            </select>
                                        </div>
                                        <button
                                            onClick={handleUrlScraping}
                                            disabled={isScraping || !websiteUrl.trim()}
                                            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                        >
                                            {isScraping ? 'Scraping...' : 'Scrape Website'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Uploaded Files */}
                            {uploadedFiles.some(f => f.sidekick === 'marketing') && (
                                <div className="mt-8">
                                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Uploaded Files</h3>
                                    <SearchBar />
                                    <div className="space-y-2">
                                        {filterFiles('marketing').map((file) => (
                                            <div key={file.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <span className="material-symbols-outlined text-slate-400">
                                                        {file.type === 'file' ? 'description' : file.type === 'url' ? 'link' : 'article'}
                                                    </span>
                                                    <div>
                                                        <span className="text-slate-700 font-medium block">{file.title}</span>
                                                        {file.type !== 'file' && file.content && (
                                                            <span className="text-slate-500 text-xs block truncate max-w-xs">{file.content}</span>
                                                        )}
                                                        <span className="text-slate-400 text-xs">{new Date(file.created_at).toLocaleDateString()} • {file.type.toUpperCase()}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteFile(file)}
                                                    className="text-red-500 hover:text-red-700"
                                                    title="Delete"
                                                >
                                                    <span className="material-symbols-outlined">delete</span>
                                                </button>
                                            </div>
                                        ))}
                                        {filterFiles('marketing').length === 0 && (
                                            <p className="text-slate-500 text-center py-4">No matching knowledge found.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminKnowledgeBasePage;
