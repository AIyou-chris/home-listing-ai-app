import React, { useState, useEffect } from 'react';
import { resolveUserId } from '../services/userId';
import { Property } from '../types';
import {
    listKb,
    addTextKb,
    addUrlKb,
    uploadFileKb,
    deleteKb,
    KbEntry
} from '../services/supabaseKb';
import { scrapeWebsite } from '../services/scraperService';

interface PropertyKnowledgeHubProps {
    propertyId: string;
    property?: Property;
    setProperty?: (p: Property) => void;
    isDemoMode?: boolean;
}

export const PropertyKnowledgeHub: React.FC<PropertyKnowledgeHubProps> = ({ propertyId, property, setProperty, isDemoMode = false }) => {
    const [entries, setEntries] = useState<KbEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [websiteUrl, setWebsiteUrl] = useState('');
    const [textNote, setTextNote] = useState('');
    const [scraping, setScraping] = useState(false);
    const [activeTab, setActiveTab] = useState<'knowledge' | 'settings'>('knowledge');

    // We treat the "Listing Agent" for this property as using the 'listing' sidekick category,
    // but scoped by propertyId.
    const SIDEKICK_TYPE = 'listing';

    useEffect(() => {
        loadEntries();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [propertyId, isDemoMode]);

    const loadEntries = async () => {
        if (isDemoMode) return;
        setLoading(true);
        try {
            const userId = resolveUserId();
            const data = await listKb(userId, SIDEKICK_TYPE, propertyId);
            setEntries(data);
        } catch (error) {
            console.error('Failed to load listing KB:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || isDemoMode) return;

        setUploading(true);
        try {
            const userId = resolveUserId();
            const files = Array.from(e.target.files);
            for (const file of files) {
                const newEntry = await uploadFileKb(userId, SIDEKICK_TYPE, file, propertyId);
                setEntries(prev => [newEntry, ...prev]);
            }
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Failed to upload file');
        } finally {
            setUploading(false);
            // reset input
            e.target.value = '';
        }
    };

    const handleAddUrl = async () => {
        if (!websiteUrl.trim() || isDemoMode) return;

        setScraping(true);
        try {
            const userId = resolveUserId();
            const url = websiteUrl.trim();
            let title = url;
            let content = '';

            try {
                const data = await scrapeWebsite(url);
                title = data.title || url;
                content = data.content || '';
            } catch (err) {
                console.warn('Scraping failed, saving URL only', err);
            }

            const newEntry = await addUrlKb(userId, SIDEKICK_TYPE, title, url, content, propertyId);
            setEntries(prev => [newEntry, ...prev]);
            setWebsiteUrl('');
        } catch (error) {
            console.error('Failed to add URL:', error);
        } finally {
            setScraping(false);
        }
    };

    const handleAddNote = async () => {
        if (!textNote.trim() || isDemoMode) return;

        try {
            const userId = resolveUserId();
            // Use first few words as title
            const title = textNote.split(' ').slice(0, 5).join(' ') + '...';
            const newEntry = await addTextKb(userId, SIDEKICK_TYPE, title, textNote.trim(), propertyId);
            setEntries(prev => [newEntry, ...prev]);
            setTextNote('');
        } catch (error) {
            console.error('Failed to add note:', error);
        }
    };

    const handleDelete = async (entry: KbEntry) => {
        if (!confirm('Delete this item?') || isDemoMode) return;
        try {
            await deleteKb(entry);
            setEntries(prev => prev.filter(e => e.id !== entry.id));
        } catch (error) {
            console.error('Delete failed:', error);
        }
    };

    const updateAiConfig = (key: string, value: string) => {
        if (!property || !setProperty || isDemoMode) return;
        setProperty({
            ...property,
            aiConfig: {
                ...property.aiConfig,
                [key]: value
            }
        });
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mt-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-slate-800">Knowledge Hub</h2>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setActiveTab('knowledge')}
                        className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === 'knowledge' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    >
                        Knowledge
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === 'settings' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    >
                        Settings
                    </button>
                </div>
            </div>

            {activeTab === 'settings' && property ? (
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Listing Agent Voice</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].map(v => (
                                <button
                                    key={v}
                                    onClick={() => updateAiConfig('voice', v)}
                                    className={`px-3 py-2 border rounded-lg text-sm capitalize flex items-center gap-2 transition-colors ${property.aiConfig?.voice === v
                                        ? 'bg-slate-900 text-white border-slate-900'
                                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-base">
                                        {property.aiConfig?.voice === v ? 'volume_up' : 'volume_mute'}
                                    </span>
                                    {v}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="aiInstructions" className="block text-sm font-medium text-slate-700 mb-1">AI Instructions & Persona</label>
                        <textarea
                            id="aiInstructions"
                            className="w-full p-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                            rows={6}
                            value={property.aiConfig?.instructions || ''}
                            onChange={(e) => updateAiConfig('instructions', e.target.value)}
                            placeholder="Describe how the AI should behave and any specific rules (e.g., 'Be energetic', 'Don't mention the dog')."
                            disabled={isDemoMode}
                        ></textarea>
                        <p className="text-xs text-slate-500 mt-1">This instructs the specific agent for this listing.</p>
                    </div>

                    {isDemoMode && (
                        <p className="text-sm text-yellow-600">Settings are disabled in demo mode.</p>
                    )}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        {/* File Upload */}
                        <div className="relative border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition-colors">
                            <input
                                type="file"
                                multiple
                                onChange={handleFileUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                disabled={uploading || isDemoMode}
                            />
                            <span className="material-symbols-outlined text-3xl text-slate-400 mb-2">upload_file</span>
                            <p className="text-sm font-medium text-slate-700">
                                {uploading ? 'Uploading...' : 'Upload Documents'}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">PDF, DOCX, Images</p>
                        </div>

                        {/* URL Input */}
                        <div className="border border-slate-200 rounded-xl p-4 flex flex-col">
                            <div className="flex-1 mb-2">
                                <span className="material-symbols-outlined text-3xl text-slate-400 mb-1">link</span>
                                <p className="text-sm font-medium text-slate-700">Add Link</p>
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={websiteUrl}
                                    onChange={(e) => setWebsiteUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="flex-1 text-xs border border-slate-300 rounded px-2 py-1"
                                    disabled={isDemoMode}
                                />
                                <button
                                    onClick={handleAddUrl}
                                    disabled={scraping || !websiteUrl || isDemoMode}
                                    className="bg-slate-900 text-white rounded px-2 py-1 text-xs"
                                >
                                    {scraping ? '...' : 'Add'}
                                </button>
                            </div>
                        </div>

                        {/* Note Input */}
                        <div className="border border-slate-200 rounded-xl p-4 flex flex-col">
                            <div className="flex-1 mb-2">
                                <span className="material-symbols-outlined text-3xl text-slate-400 mb-1">sticky_note_2</span>
                                <p className="text-sm font-medium text-slate-700">Quick Note</p>
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={textNote}
                                    onChange={(e) => setTextNote(e.target.value)}
                                    placeholder="Gate code is 1234..."
                                    className="flex-1 text-xs border border-slate-300 rounded px-2 py-1"
                                    disabled={isDemoMode}
                                />
                                <button
                                    onClick={handleAddNote}
                                    disabled={!textNote || isDemoMode}
                                    className="bg-slate-900 text-white rounded px-2 py-1 text-xs"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* List */}
                    <div className="space-y-2">
                        {loading && <p className="text-center text-slate-500 text-sm">Loading knowledge...</p>}
                        {!loading && entries.length === 0 && (
                            <p className="text-center text-slate-400 text-sm py-4">No knowledge added for this listing yet.</p>
                        )}
                        {entries.map(entry => (
                            <div key={entry.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <span className="material-symbols-outlined text-slate-500 flex-shrink-0">
                                        {entry.type === 'file' ? 'description' : entry.type === 'url' ? 'public' : 'article'}
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-slate-900 truncate">{entry.title}</p>
                                        <p className="text-xs text-slate-500">
                                            {new Date(entry.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(entry)}
                                    className="p-1 hover:bg-white rounded-full text-slate-400 hover:text-red-500 transition-colors"
                                    disabled={isDemoMode}
                                >
                                    <span className="material-symbols-outlined text-lg">delete</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};
