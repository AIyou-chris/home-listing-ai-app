
import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { supabase } from '../../services/supabase';
import { Toaster, toast } from 'react-hot-toast';
import {
    Layout, Plus, Save, Trash2, ArrowLeft, Image as ImageIcon,
    Sparkles, RefreshCw, Eye, Calendar, Globe
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';

interface BlogPost {
    id: string;
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    featured_image: string;
    status: 'draft' | 'published';
    published_at: string | null;
    seo_title: string;
    seo_description: string;
    seo_keywords: string[];
    author_id?: string;
}

const BlogEditor: React.FC = () => {
    const [view, setView] = useState<'list' | 'edit'>('list');
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [currentPost, setCurrentPost] = useState<Partial<BlogPost>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState<any>(null); // Placeholder for AI results
    const [aiInstructions, setAiInstructions] = useState('');

    useEffect(() => {
        if (view === 'list') {
            fetchPosts();
        }
    }, [view]);

    const fetchPosts = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('blog_posts')
            .select('id, title, slug, status, published_at, created_at')
            .order('created_at', { ascending: false });

        if (error) {
            toast.error('Failed to fetch posts');
            console.error(error);
        } else {
            setPosts((data as any) || []);
        }
        setIsLoading(false);
    };

    const handleCreateNew = () => {
        setCurrentPost({
            status: 'draft',
            content: '',
            title: '',
            slug: '',
            seo_keywords: []
        });
        setView('edit');
    };

    const handleEdit = async (post: BlogPost) => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('blog_posts')
            .select('*')
            .eq('id', post.id)
            .single();

        if (error) {
            toast.error('Failed to load post details');
            console.error(error);
        } else {
            setCurrentPost(data);
            setView('edit');
        }
        setIsLoading(false);
    };

    const handleSave = async (status: 'draft' | 'published') => {
        if (!currentPost.title) {
            toast.error('Title is required');
            return;
        }

        setIsLoading(true);
        const slug = currentPost.slug || currentPost.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

        const postData = {
            ...currentPost,
            slug,
            status,
            published_at: status === 'published' ? (currentPost.published_at || new Date().toISOString()) : null,
            updated_at: new Date().toISOString()
        };

        let result;
        if (currentPost.id) {
            result = await supabase
                .from('blog_posts')
                .update(postData)
                .eq('id', currentPost.id)
                .select()
                .single();
        } else {
            result = await supabase
                .from('blog_posts')
                .insert([postData])
                .select()
                .single();
        }

        if (result.error) {
            toast.error(`Error saving post: ${result.error.message}`);
        } else {
            toast.success(`Post ${status === 'published' ? 'published' : 'saved'}!`);
            setCurrentPost(result.data);
            if (view === 'list') fetchPosts();
        }
        setIsLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this post?')) return;

        const { error } = await supabase
            .from('blog_posts')
            .delete()
            .eq('id', id);

        if (error) {
            toast.error('Error deleting post');
        } else {
            toast.success('Post deleted');
            fetchPosts();
        }
    };

    // Placeholder for AI Analysis
    const runAIAnalysis = async () => {
        setIsLoading(true);
        // Simulate AI delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        setAiAnalysis({
            readability: 75,
            seoHealth: 60,
            keywords: ['real estate', 'market trends', 'AI technology'],
            suggestions: [
                'Consider breaking up long paragraphs.',
                'Add more internal links.',
                'Ensure alt text is present for all images.'
            ]
        });
        setIsLoading(false);
        toast.success('AI Analysis Complete');
    };

    if (view === 'list') {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Blog Posts</h1>
                        <p className="text-slate-500">Manage your content and articles</p>
                    </div>
                    <button
                        onClick={handleCreateNew}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        <Plus size={20} /> New Post
                    </button>
                </div>

                {isLoading ? (
                    <div className="text-center py-12">Loading...</div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-slate-700">Title</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700">Published</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {posts.map(post => (
                                    <tr key={post.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-slate-900">{post.title}</p>
                                            <p className="text-xs text-slate-500">/{post.slug}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${post.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-sm">
                                            {post.published_at ? new Date(post.published_at).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button
                                                onClick={() => handleEdit(post)}
                                                className="text-indigo-600 hover:text-indigo-900 p-1 hover:bg-indigo-50 rounded"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(post.id)}
                                                className="text-rose-600 hover:text-rose-900 p-1 hover:bg-rose-50 rounded"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {posts.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                            No posts found. Create your first one!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Toaster />
            {/* Toolbar */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setView('list')}
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-500"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-xl font-bold text-slate-800">
                        {currentPost.id ? 'Edit Post' : 'New Post'}
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-500">
                        {currentPost.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                    <button
                        onClick={() => handleSave('draft')}
                        disabled={isLoading}
                        className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 font-medium disabled:opacity-50"
                    >
                        Save Draft
                    </button>
                    <button
                        onClick={() => handleSave('published')}
                        disabled={isLoading}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2 disabled:opacity-50"
                    >
                        <Globe size={18} /> Publish
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Editor */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
                            <input
                                type="text"
                                value={currentPost.title || ''}
                                onChange={(e) => setCurrentPost({ ...currentPost, title: e.target.value })}
                                className="w-full px-4 py-3 text-2xl font-bold border-0 border-b-2 border-slate-100 focus:border-indigo-500 focus:ring-0 placeholder-slate-300"
                                placeholder="Enter post title..."
                            />
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Content</label>
                            <div className="prose-editor">
                                <ReactQuill
                                    theme="snow"
                                    value={currentPost.content || ''}
                                    onChange={(content) => setCurrentPost({ ...currentPost, content })}
                                    style={{ height: '400px', marginBottom: '50px' }}
                                    modules={{
                                        toolbar: [
                                            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                                            ['bold', 'italic', 'underline', 'strike', 'blockquote', 'code-block'],
                                            [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
                                            [{ 'script': 'sub' }, { 'script': 'super' }],
                                            [{ 'align': [] }],
                                            ['link', 'image', 'video'],
                                            ['clean']
                                        ],
                                    }}
                                />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Excerpt</label>
                            <textarea
                                value={currentPost.excerpt || ''}
                                onChange={(e) => setCurrentPost({ ...currentPost, excerpt: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                rows={3}
                                placeholder="Short summary for preview cards..."
                            />
                        </div>
                    </div>

                    {/* Sidebar Settings */}
                    <div className="space-y-6">
                        {/* AI Assistant */}
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-100">
                            <div className="flex items-center gap-2 mb-4">
                                <Sparkles className="text-indigo-600" size={20} />
                                <h3 className="font-semibold text-indigo-900">AI Assistant</h3>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-indigo-800 mb-1">Instructions (Optional)</label>
                                    <textarea
                                        value={aiInstructions}
                                        onChange={(e) => setAiInstructions(e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-indigo-200 rounded-lg bg-white/50 focus:bg-white transition-colors"
                                        placeholder="e.g. Focus on luxury market trends..."
                                        rows={2}
                                    />
                                </div>

                                <button
                                    onClick={runAIAnalysis}
                                    disabled={isLoading}
                                    className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 text-sm font-medium transition-all shadow-sm hover:shadow"
                                >
                                    {isLoading ? <RefreshCw className="animate-spin" size={16} /> : <Sparkles size={16} />}
                                    Analyze & Optimize
                                </button>

                                {aiAnalysis && (
                                    <div className="space-y-3 pt-3 border-t border-indigo-100">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-indigo-800">Readability</span>
                                            <span className="font-bold text-indigo-600">{aiAnalysis.readability}/100</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-indigo-800">SEO Health</span>
                                            <span className="font-bold text-indigo-600">{aiAnalysis.seoHealth}/100</span>
                                        </div>
                                        <div className="text-xs text-indigo-700 bg-white/60 p-2 rounded">
                                            <span className="font-semibold block mb-1">Suggestions:</span>
                                            <ul className="list-disc list-inside space-y-1">
                                                {aiAnalysis.suggestions.map((s: string, i: number) => (
                                                    <li key={i}>{s}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Featured Image */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Featured Image</label>
                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-lg hover:border-indigo-500 transition-colors cursor-pointer group bg-slate-50 hover:bg-slate-100">
                                <div className="space-y-1 text-center">
                                    {currentPost.featured_image ? (
                                        <div className="relative">
                                            <img src={currentPost.featured_image} alt="Preview" className="mx-auto h-32 object-cover rounded" />
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setCurrentPost({ ...currentPost, featured_image: '' });
                                                }}
                                                className="absolute -top-2 -right-2 bg-white text-slate-500 hover:text-red-500 rounded-full p-1 shadow border border-slate-200"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <ImageIcon className="mx-auto h-12 w-12 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                            <div className="flex text-sm text-slate-600 justify-center">
                                                <label className="relative cursor-pointer rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                                                    <span>Upload a file</span>
                                                    <input type="file" className="sr-only" onChange={(e) => {
                                                        // Placeholder for file upoad
                                                        if (e.target.files?.[0]) {
                                                            const reader = new FileReader();
                                                            reader.onloadend = () => {
                                                                setCurrentPost({ ...currentPost, featured_image: reader.result as string });
                                                            };
                                                            reader.readAsDataURL(e.target.files[0]);
                                                        }
                                                    }} />
                                                </label>
                                            </div>
                                            <p className="text-xs text-slate-500">PNG, JPG, GIF up to 10MB</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* SEO Properties */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="font-semibold text-slate-800 mb-4">SEO Settings</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">SEO Title</label>
                                    <input
                                        type="text"
                                        value={currentPost.seo_title || ''}
                                        onChange={(e) => setCurrentPost({ ...currentPost, seo_title: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">SEO Description</label>
                                    <textarea
                                        value={currentPost.seo_description || ''}
                                        onChange={(e) => setCurrentPost({ ...currentPost, seo_description: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                        rows={3}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Keywords (comma separated)</label>
                                    <input
                                        type="text"
                                        value={currentPost.seo_keywords?.join(', ') || ''}
                                        onChange={(e) => setCurrentPost({ ...currentPost, seo_keywords: e.target.value.split(',').map(s => s.trim()) })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">URL Slug</label>
                                    <input
                                        type="text"
                                        value={currentPost.slug || ''}
                                        onChange={(e) => setCurrentPost({ ...currentPost, slug: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BlogEditor;
