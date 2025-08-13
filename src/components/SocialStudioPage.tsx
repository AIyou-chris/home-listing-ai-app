
import React, { useState, useMemo, useCallback } from 'react';
import { Property, SocialPost, SocialPlatform, SAMPLE_SOCIAL_POSTS } from '../types';
import { generateSocialPostText } from '../services/geminiService';

interface SocialStudioPageProps {
    properties: Property[];
}

const platformIcons: Record<SocialPlatform, React.ReactElement<{ className?: string }>> = {
    facebook: <span className="material-symbols-outlined">facebook</span>,
    instagram: <span className="material-symbols-outlined">photo_camera</span>,
    twitter: <span className="material-symbols-outlined">twitter</span>,
    linkedin: <span className="material-symbols-outlined">work</span>,
};

const SocialStudioPage: React.FC<SocialStudioPageProps> = ({ properties }) => {
    const [posts, setPosts] = useState<SocialPost[]>(SAMPLE_SOCIAL_POSTS);
    const [content, setContent] = useState('');
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>(properties[0]?.id || '');
    const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>(['facebook']);
    const [isGenerating, setIsGenerating] = useState(false);

    const selectedProperty = useMemo(() => properties.find(p => p.id === selectedPropertyId), [properties, selectedPropertyId]);

    const handlePlatformToggle = (platform: SocialPlatform) => {
        setSelectedPlatforms(prev => 
            prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
        );
    };

    const handleGenerateText = useCallback(async () => {
        if (!selectedProperty || selectedPlatforms.length === 0) {
            alert("Please select a property and at least one platform.");
            return;
        }
        setIsGenerating(true);
        const text = await generateSocialPostText(selectedProperty, selectedPlatforms);
        setContent(text);
        setIsGenerating(false);
    }, [selectedProperty, selectedPlatforms]);

    const handleSchedulePost = () => {
        if (!content || !selectedProperty || selectedPlatforms.length === 0) {
            alert("Please select a property, add content, and select at least one platform to schedule a post.");
            return;
        }
        // Mock scheduling
        const newPost: SocialPost = {
            id: `post-${Date.now()}`,
            propertyId: selectedProperty.id,
            propertyAddress: selectedProperty.address,
            platforms: selectedPlatforms,
            content: content,
            imageUrl: selectedProperty.imageUrl,
            status: 'scheduled',
            postAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
        };
        setPosts(prev => [newPost, ...prev]);
        setContent('');
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Left side: Composer */}
            <div className="lg:col-span-3 space-y-6">
                <div className="p-4 rounded-lg bg-teal-50 border border-teal-200 flex items-start gap-3 text-sm">
                    <span className="material-symbols-outlined w-6 h-6 text-teal-600 flex-shrink-0 mt-0.5">rss_feed</span>
                    <div>
                        <h3 className="font-semibold text-teal-800">Social Posting Studio</h3>
                        <p className="text-teal-700">Craft, schedule, and automate social media posts for your listings. Use AI to generate engaging content in seconds.</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/60">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Post Composer</h3>
                    
                    <div>
                        <label htmlFor="property-select" className="block text-sm font-medium text-slate-700 mb-1">Select Property</label>
                        <select id="property-select" value={selectedPropertyId} onChange={e => setSelectedPropertyId(e.target.value)} className="w-full bg-white px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition">
                            {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
                        </select>
                    </div>

                    <div className="mt-4">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Select Platforms</label>
                        <div className="flex gap-2">
                            {(Object.keys(platformIcons) as SocialPlatform[]).map(p => (
                                <button key={p} onClick={() => handlePlatformToggle(p)} className={`flex-1 p-2 rounded-lg border-2 flex items-center justify-center gap-2 transition-colors ${selectedPlatforms.includes(p) ? 'bg-primary-50 border-primary-500 text-primary-700' : 'bg-slate-100 border-transparent hover:bg-slate-200'}`}>
                                    {platformIcons[p]}
                                    <span className="capitalize text-sm font-semibold">{p}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-4">
                        <label htmlFor="content" className="block text-sm font-medium text-slate-700 mb-1">Content</label>
                        <textarea id="content" value={content} onChange={e => setContent(e.target.value)} rows={7} className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition" placeholder="Write your post or generate with AI..."></textarea>
                        <div className="flex justify-end gap-2 mt-2">
                             <button onClick={handleGenerateText} disabled={isGenerating || !selectedProperty || selectedPlatforms.length === 0} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:bg-slate-400">
                                <span className="material-symbols-outlined w-4 h-4">sparkles</span>
                                <span>{isGenerating ? 'Generating...' : 'Generate with AI'}</span>
                            </button>
                            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-200 rounded-lg hover:bg-slate-300 disabled:opacity-50" disabled>
                                <span className="material-symbols-outlined w-4 h-4">edit</span>
                                <span>Improve</span>
                            </button>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4">
                        <button disabled className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition disabled:opacity-50">Post Now</button>
                        <button onClick={handleSchedulePost} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition">
                            <span className="material-symbols-outlined w-4 h-4">calendar_today</span>
                            <span>Schedule</span>
                        </button>
                         <button disabled className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                            <span className="material-symbols-outlined w-4 h-4">add</span>
                            <span>Add to Auto-Post Queue</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/60">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><span className="material-symbols-outlined w-5 h-5 text-slate-500">calendar_today</span> Upcoming Posts</h3>
                    <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                        {posts.map(post => (
                            <div key={post.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <p className="text-xs text-slate-600 font-medium truncate">{post.content}</p>
                                <div className="mt-2 flex justify-between items-center">
                                    <div className="flex items-center gap-1.5">
                                        {post.platforms.map(p => <div key={p} className="text-slate-500">{React.cloneElement(platformIcons[p], {className: 'w-4 h-4'})}</div>)}
                                    </div>
                                    <p className="text-xs font-bold text-green-700">{new Date(post.postAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/60">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><span className="material-symbols-outlined w-5 h-5 text-slate-500">schedule</span> Auto-Posting Settings</h3>
                    
                    <div className="flex items-center justify-between p-3 bg-slate-100 rounded-lg">
                        <label htmlFor="auto-post-toggle" className="font-semibold text-slate-700">Enable Auto-Posting</label>
                        <div className="relative inline-flex items-center h-6 rounded-full w-11 cursor-pointer bg-slate-300">
                             <span className="inline-block w-4 h-4 transform bg-white rounded-full transition-transform translate-x-1" />
                        </div>
                    </div>

                    <div className="mt-4 space-y-3 text-sm">
                        <div>
                            <label className="font-medium text-slate-600">Frequency</label>
                            <select className="w-full bg-white px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition mt-1">
                                <option>3 times per week</option>
                                <option>Every weekday</option>
                                <option>Once per day</option>
                            </select>
                        </div>
                         <div>
                            <label className="font-medium text-slate-600">Content Categories</label>
                            <div className="mt-1 space-y-1">
                                <div className="flex items-center gap-2"><input type="checkbox" defaultChecked className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"/><span>New Listings</span></div>
                                <div className="flex items-center gap-2"><input type="checkbox" defaultChecked className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"/><span>Open House Reminders</span></div>
                                <div className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"/><span>Market Updates</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SocialStudioPage;
