import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { supabase } from '../../services/supabase';
import { toast } from 'react-hot-toast';
import { Trash2, ArrowLeft, Sparkles, Globe, Copy, Check, RefreshCw, Search, X } from 'lucide-react';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';

interface BlogPost {
  id: string; title: string; slug: string; content: string; excerpt: string;
  featured_image: string; featured_image_alt?: string; status: 'draft' | 'published';
  published_at: string | null; seo_title: string; seo_description: string;
  seo_keywords: string[]; author_id?: string;
}

type SocialPlatform = 'linkedin' | 'instagram' | 'facebook' | 'facebook_group' | 'notion';
const PLATFORMS: { id: SocialPlatform; label: string; icon: string }[] = [
  { id: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { id: 'instagram', label: 'Instagram', icon: '📸' },
  { id: 'facebook', label: 'Facebook', icon: '👥' },
  { id: 'facebook_group', label: 'FB Group', icon: '🏘️' },
  { id: 'notion', label: 'Notion', icon: '📝' },
];

const authHeader = () => {
  const token = localStorage.getItem('sb-yocchddxdsaldgsibmmc-auth-token');
  try { return { Authorization: `Bearer ${JSON.parse(token || '{}')?.access_token}` }; }
  catch { return {}; }
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-600 transition-all">
      {copied ? <><Check size={12} className="text-emerald-500" /> Copied!</> : <><Copy size={12} /> Copy</>}
    </button>
  );
}

const BlogEditor: React.FC = () => {
  const [view, setView] = useState<'list' | 'edit' | 'repurpose'>('list');
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [currentPost, setCurrentPost] = useState<Partial<BlogPost>>({});
  const [isLoading, setIsLoading] = useState(false);

  // AI writer
  const [idea, setIdea] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Image picker
  const [imageQuery, setImageQuery] = useState('');
  const [images, setImages] = useState<{ id: string; url: string; thumb: string; credit: string }[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);

  // Social repurpose
  const [repurposed, setRepurposed] = useState<Record<SocialPlatform, string> | null>(null);
  const [isRepurposing, setIsRepurposing] = useState(false);
  const [activePlatform, setActivePlatform] = useState<SocialPlatform>('linkedin');

  useEffect(() => { if (view === 'list') fetchPosts(); }, [view]);

  const fetchPosts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('blog_posts').select('id, title, slug, status, published_at, created_at').order('created_at', { ascending: false });
    if (error) toast.error('Failed to fetch posts');
    else setPosts((data as unknown as BlogPost[]) || []);
    setIsLoading(false);
  };

  const handleEdit = async (post: BlogPost) => {
    setIsLoading(true);
    const { data, error } = await supabase.from('blog_posts').select('*').eq('id', post.id).single();
    if (error) toast.error('Failed to load post');
    else { setCurrentPost(data); setRepurposed(null); setView('edit'); }
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this post permanently?')) return;
    const { error } = await supabase.from('blog_posts').delete().eq('id', id);
    if (error) toast.error('Error deleting post');
    else { toast.success('Post deleted'); fetchPosts(); }
  };

  const handleSave = async (status: 'draft' | 'published') => {
    if (!currentPost.title) { toast.error('Title is required'); return; }
    setIsLoading(true);
    const slug = currentPost.slug || currentPost.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const postData = { ...currentPost, slug, status, published_at: status === 'published' ? (currentPost.published_at || new Date().toISOString()) : null, updated_at: new Date().toISOString() };

    let result;
    if (currentPost.id) result = await supabase.from('blog_posts').update(postData).eq('id', currentPost.id).select().single();
    else result = await supabase.from('blog_posts').insert([postData]).select().single();

    if (result.error) { toast.error(`Error: ${result.error.message}`); }
    else {
      toast.success(status === 'published' ? '🚀 Published!' : '💾 Draft saved');
      setCurrentPost(result.data);
      if (status === 'published') pingSearch(result.data.slug);
    }
    setIsLoading(false);
  };

  const pingSearch = async (slug: string) => {
    try {
      await fetch(`${API}/api/admin/blog/ping`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader() }, body: JSON.stringify({ slug }) });
      toast.success('📡 Pinged Google & Bing indexing', { duration: 3000 });
    } catch { /* non-fatal */ }
  };

  const handleGenerate = async () => {
    if (!idea.trim()) { toast.error('Enter a blog idea first'); return; }
    setIsGenerating(true);
    try {
      const r = await fetch(`${API}/api/admin/blog/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader() }, body: JSON.stringify({ idea }) });
      const data = await r.json();
      if (data.post) {
        setCurrentPost({ status: 'draft', seo_keywords: [], ...data.post });
        setIdea('');
        setView('edit');
        toast.success('✨ Blog generated!');
        if (data.post.image_search_query) {
          setImageQuery(data.post.image_search_query);
          fetchImages(data.post.image_search_query);
          setShowImagePicker(true);
        }
      } else toast.error('Generation failed');
    } catch { toast.error('Failed to generate'); }
    setIsGenerating(false);
  };

  const fetchImages = async (q: string) => {
    if (!q.trim()) return;
    setIsLoadingImages(true);
    try {
      const r = await fetch(`${API}/api/admin/blog/images?query=${encodeURIComponent(q)}`, { headers: authHeader() });
      const data = await r.json();
      setImages(data.images || []);
    } catch { toast.error('Image search failed'); }
    setIsLoadingImages(false);
  };

  const handleRepurpose = async () => {
    if (!currentPost.title || !currentPost.content) { toast.error('Save post first'); return; }
    setIsRepurposing(true);
    try {
      const r = await fetch(`${API}/api/admin/blog/repurpose`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader() }, body: JSON.stringify({ title: currentPost.title, content: currentPost.content, excerpt: currentPost.excerpt }) });
      const data = await r.json();
      if (data.repurposed) { setRepurposed(data.repurposed); setView('repurpose'); toast.success('✨ Social content ready!'); }
      else toast.error('Failed to repurpose');
    } catch { toast.error('Failed to repurpose'); }
    setIsRepurposing(false);
  };

  // ── List View ─────────────────────────────────────────────────────────────
  if (view === 'list') return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Blog Control Center</h1>
          <p className="text-slate-500 text-sm mt-1">Write, publish, and repurpose your content.</p>
        </div>
        <button onClick={() => { setCurrentPost({ status: 'draft', content: '', title: '', slug: '', seo_keywords: [] }); setRepurposed(null); setView('edit'); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-bold text-sm transition-all">
          + New Post
        </button>
      </div>

      {/* AI Writer Box */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={18} className="text-indigo-600" />
          <h3 className="font-bold text-indigo-900">AI Blog Writer</h3>
          <span className="text-[10px] bg-indigo-200 text-indigo-700 px-2 py-0.5 rounded-full font-bold uppercase">GPT-4o</span>
        </div>
        <div className="flex gap-3">
          <input value={idea} onChange={e => setIdea(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleGenerate()}
            placeholder="Enter a topic idea... e.g. 'How LOs can use AI to get more agent referrals'"
            className="flex-1 px-4 py-2.5 border border-indigo-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          <button onClick={handleGenerate} disabled={isGenerating}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-60 transition-all min-w-[120px] justify-center">
            {isGenerating ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {isGenerating ? 'Writing…' : 'Write It'}
          </button>
        </div>
      </div>

      {/* Post list */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {isLoading ? <div className="p-12 text-center text-slate-400">Loading…</div> : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Title', 'Status', 'Published', 'Actions'].map(h => (
                  <th key={h} className={`px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide ${h === 'Actions' ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {posts.map(post => (
                <tr key={post.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-slate-900">{post.title}</p>
                    <p className="text-xs text-slate-400">/{post.slug}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${post.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {post.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-400 text-xs">{post.published_at ? new Date(post.published_at).toLocaleDateString() : '—'}</td>
                  <td className="px-5 py-3 text-right flex items-center justify-end gap-2">
                    <button onClick={() => handleEdit(post)} className="px-3 py-1.5 text-xs font-bold text-primary-600 hover:bg-primary-50 rounded-lg transition-all">Edit</button>
                    <button onClick={() => handleDelete(post.id)} className="p-1.5 text-rose-400 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
              {posts.length === 0 && <tr><td colSpan={4} className="px-5 py-12 text-center text-slate-400">No posts yet. Use the AI writer above to create your first one.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  // ── Repurpose View ────────────────────────────────────────────────────────
  if (view === 'repurpose' && repurposed) return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => setView('edit')} className="p-2 hover:bg-slate-100 rounded-full"><ArrowLeft size={20} /></button>
        <div>
          <h1 className="text-xl font-black text-slate-900">Repurpose: {currentPost.title}</h1>
          <p className="text-slate-500 text-sm">Copy each version and paste directly into the platform.</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {PLATFORMS.map(p => (
          <button key={p.id} onClick={() => setActivePlatform(p.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activePlatform === p.id ? 'bg-primary-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:border-primary-300'}`}>
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      {PLATFORMS.filter(p => p.id === activePlatform).map(p => (
        <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-lg">{p.icon} {p.label} Version</h3>
            <CopyButton text={repurposed[p.id]} />
          </div>
          <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-y-auto">
            {repurposed[p.id]}
          </div>
        </div>
      ))}
    </div>
  );

  // ── Edit View ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-0 -mx-6 -mt-6">
      {/* Toolbar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('list')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><ArrowLeft size={20} /></button>
          <h1 className="text-lg font-black text-slate-800">{currentPost.id ? 'Edit Post' : 'New Post'}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRepurpose} disabled={isRepurposing || !currentPost.id}
            className="flex items-center gap-2 px-4 py-2 border border-indigo-300 text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-50 disabled:opacity-40 transition-all">
            {isRepurposing ? <RefreshCw size={15} className="animate-spin" /> : '🔁'} Repurpose
          </button>
          <button onClick={() => handleSave('draft')} disabled={isLoading}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 disabled:opacity-50 transition-all">
            Save Draft
          </button>
          <button onClick={() => handleSave('published')} disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl font-bold text-sm hover:bg-primary-700 disabled:opacity-50 transition-all">
            <Globe size={16} /> Publish
          </button>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 bg-slate-50 min-h-screen">
        {/* Main Editor */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200">
            <input type="text" value={currentPost.title || ''} onChange={e => setCurrentPost({ ...currentPost, title: e.target.value })}
              className="w-full text-2xl font-black border-0 border-b-2 border-slate-100 focus:border-primary-400 focus:ring-0 pb-3 placeholder-slate-300 outline-none"
              placeholder="Post title…" />
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Content</label>
            <ReactQuill theme="snow" value={currentPost.content || ''} onChange={content => setCurrentPost({ ...currentPost, content })}
              style={{ height: '420px', marginBottom: '50px' }}
              modules={{ toolbar: [[{ header: [1, 2, 3, false] }], ['bold', 'italic', 'underline', 'blockquote'], [{ list: 'ordered' }, { list: 'bullet' }], ['link', 'image'], ['clean']] }} />
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Excerpt</label>
            <textarea value={currentPost.excerpt || ''} onChange={e => setCurrentPost({ ...currentPost, excerpt: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" rows={3} placeholder="2-3 sentence summary for preview cards…" />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Image Picker */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Featured Image</label>
              <button onClick={() => setShowImagePicker(!showImagePicker)} className="text-xs text-primary-600 font-bold hover:underline">
                {showImagePicker ? 'Hide picker' : 'Search photos'}
              </button>
            </div>

            {currentPost.featured_image && (
              <div className="relative mb-3">
                <img src={currentPost.featured_image} alt="" className="w-full h-36 object-cover rounded-xl" />
                <button onClick={() => setCurrentPost({ ...currentPost, featured_image: '' })}
                  className="absolute top-2 right-2 bg-white text-slate-500 hover:text-red-500 rounded-full p-1 shadow border border-slate-200">
                  <X size={14} />
                </button>
              </div>
            )}

            {showImagePicker && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input value={imageQuery} onChange={e => setImageQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchImages(imageQuery)}
                    placeholder="Search photos…" className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
                  <button onClick={() => fetchImages(imageQuery)} disabled={isLoadingImages} className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                    {isLoadingImages ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {images.map(img => (
                    <button key={img.id} onClick={() => { setCurrentPost({ ...currentPost, featured_image: img.url }); setShowImagePicker(false); }}
                      className="relative group overflow-hidden rounded-lg aspect-video border-2 border-transparent hover:border-primary-400 transition-all">
                      <img src={img.thumb} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
                    </button>
                  ))}
                  {images.length === 0 && !isLoadingImages && <p className="col-span-3 text-xs text-slate-400 text-center py-3">Search for photos above</p>}
                </div>
              </div>
            )}

            <input type="text" value={currentPost.featured_image || ''} onChange={e => setCurrentPost({ ...currentPost, featured_image: e.target.value })}
              className="w-full mt-2 px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none" placeholder="Or paste image URL…" />
          </div>

          {/* SEO */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">SEO</label>
            <input type="text" value={currentPost.seo_title || ''} onChange={e => setCurrentPost({ ...currentPost, seo_title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" placeholder="SEO title (60 chars)" />
            <textarea value={currentPost.seo_description || ''} onChange={e => setCurrentPost({ ...currentPost, seo_description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" rows={2} placeholder="Meta description (155 chars)" />
            <input type="text" value={(currentPost.seo_keywords || []).join(', ')} onChange={e => setCurrentPost({ ...currentPost, seo_keywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean) })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" placeholder="Keywords, comma separated" />
            <input type="text" value={currentPost.slug || ''} onChange={e => setCurrentPost({ ...currentPost, slug: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-300" placeholder="url-slug" />
          </div>

          {/* Repurpose CTA */}
          {currentPost.id && (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-5">
              <h3 className="font-bold text-indigo-900 mb-1">🔁 Repurpose This Post</h3>
              <p className="text-indigo-700 text-xs mb-3">Generate LinkedIn, Instagram, Facebook, FB Group, and Notion versions in one click.</p>
              <button onClick={handleRepurpose} disabled={isRepurposing}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-60 transition-all">
                {isRepurposing ? <><RefreshCw size={15} className="animate-spin" /> Generating…</> : <><Sparkles size={15} /> Repurpose for Social</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlogEditor;
