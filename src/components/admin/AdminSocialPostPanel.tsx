import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { AuthService } from '../../services/authService';
import { supabase } from '../../services/supabase';
import { buildApiUrl } from '../../lib/api';

type Channel = {
  id: string;
  name: string | null;
  displayName: string | null;
  service: string | null;
  isQueuePaused: boolean;
};

type SocialConfig = {
  auto_post_channel_ids: string[];
  auto_post_blog: boolean;
};

type StatusResponse = {
  configured: boolean;
  account: { email?: string } | null;
  channels: Channel[];
  config: SocialConfig;
};

const CARD = 'bg-white rounded-2xl border border-slate-200 p-6 shadow-sm';

const SERVICE_META: Record<string, { icon: string; label: string; color: string }> = {
  linkedin: { icon: '💼', label: 'LinkedIn', color: 'text-sky-700' },
  facebook: { icon: '📘', label: 'Facebook', color: 'text-blue-700' },
  instagram: { icon: '📷', label: 'Instagram — needs an image', color: 'text-pink-700' },
};

const AdminSocialPostPanel: React.FC = () => {
  const auth = useMemo(() => AuthService.getInstance(), []);

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [autoPost, setAutoPost] = useState(true);
  const [savingCfg, setSavingCfg] = useState(false);

  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [scheduleAt, setScheduleAt] = useState('');
  const [posting, setPosting] = useState(false);
  const [tagging, setTagging] = useState(false);
  const [writing, setWriting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [imageTweak, setImageTweak] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [stockQuery, setStockQuery] = useState('');
  const [stockResults, setStockResults] = useState<Array<{ id: string; url: string; thumb: string; credit: string }>>([]);
  const [stockOpen, setStockOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await auth.makeAuthenticatedRequest('/api/admin/social/status');
      const d: StatusResponse = await res.json();
      setStatus(d);
      setSelected(Array.isArray(d?.config?.auto_post_channel_ids) ? d.config.auto_post_channel_ids : []);
      setAutoPost(d?.config?.auto_post_blog !== false);
    } catch {
      toast.error('Could not load social status.');
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => { load(); }, [load]);

  const saveConfig = useCallback(async (patch: { autoPostChannelIds?: string[]; autoPostBlog?: boolean }) => {
    setSavingCfg(true);
    try {
      const res = await auth.makeAuthenticatedRequest('/api/admin/social/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error('Save failed.');
    } finally {
      setSavingCfg(false);
    }
  }, [auth]);

  const toggleChannel = (id: string) => {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    setSelected(next);
    saveConfig({ autoPostChannelIds: next });
  };

  const onToggleAuto = () => {
    const next = !autoPost;
    setAutoPost(next);
    saveConfig({ autoPostBlog: next });
  };

  const submitPost = useCallback(async () => {
    if (!text.trim()) { toast.error('Write something first.'); return; }
    if (!selected.length) { toast.error('Pick at least one channel.'); return; }
    setPosting(true);
    try {
      const body: Record<string, unknown> = { text, channelIds: selected };
      if (imageUrl.trim()) body.imageUrls = [imageUrl.trim()];
      if (scheduleAt) body.dueAt = new Date(scheduleAt).toISOString();
      // Raw fetch: posting to multiple channels (esp. Instagram image
      // processing) can exceed makeAuthenticatedRequest's 15s cap.
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch(buildApiUrl('/api/admin/social/post'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      const results: Array<{ ok: boolean; channelId: string; channelName?: string | null; error?: string }> = d?.results || [];
      const okCount = results.filter((r) => r.ok).length;
      const failed = results.filter((r) => !r.ok);
      const nameOf = (r: { channelName?: string | null }) => r.channelName || 'a channel';
      if (!res.ok || okCount === 0) {
        throw new Error(failed.map((r) => `${nameOf(r)}: ${r.error || 'failed'}`).join(' · ') || d?.detail || 'all channels failed');
      }
      const verb = scheduleAt ? 'Scheduled' : 'Posted';
      toast.success(`${verb} on ${okCount} channel${okCount === 1 ? '' : 's'} ✓`);
      failed.forEach((r) => toast.error(`${nameOf(r)}: ${r.error || 'failed'}`, { duration: 8000 }));
      setText('');
      setImageUrl('');
      setScheduleAt('');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown error';
      toast.error(`Post failed: ${msg}`);
    } finally {
      setPosting(false);
    }
  }, [text, selected, scheduleAt, imageUrl]);

  const uploadImage = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file.'); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error('Image is too large (max 8MB).'); return; }
    setUploading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(buildApiUrl('/api/admin/social/upload'), {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const d = await res.json();
      if (!res.ok || !d.url) throw new Error(d?.error || 'upload failed');
      setImageUrl(d.url);
      toast.success('Image attached ✓');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown error';
      toast.error(`Upload failed: ${msg}`);
    } finally {
      setUploading(false);
    }
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadImage(file);
  };

  const writeFullPost = useCallback(async () => {
    if (!text.trim()) { toast.error('Type a sentence or two first — I’ll expand it.'); return; }
    setWriting(true);
    try {
      const res = await auth.makeAuthenticatedRequest('/api/admin/social/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: text }),
      });
      const d = await res.json();
      if (!res.ok || !d.text) throw new Error(d?.detail || d?.error || 'no text returned');
      setText(String(d.text));
      toast.success('Full post written — review and edit before posting ✓');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown error';
      toast.error(`Write failed: ${msg}`);
    } finally {
      setWriting(false);
    }
  }, [auth, text]);

  const searchStock = useCallback(async () => {
    const q = stockQuery.trim();
    if (!q) { toast.error('Type what kind of photo you want.'); return; }
    setSearching(true);
    try {
      const res = await auth.makeAuthenticatedRequest(`/api/admin/blog/images?query=${encodeURIComponent(q)}&orientation=squarish`);
      const d = await res.json();
      const imgs = Array.isArray(d?.images) ? d.images : [];
      if (!res.ok || !imgs.length) throw new Error(d?.error || 'no photos found');
      if (d.fallback) toast('⚠️ Unsplash key not set — showing default photos (search ignored)', { duration: 5000 });
      setStockResults(imgs);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Photo search failed');
    } finally {
      setSearching(false);
    }
  }, [auth, stockQuery]);

  const generateImage = useCallback(async () => {
    if (!text.trim()) { toast.error('Write your post first — the image is generated from it.'); return; }
    setGenerating(true);
    try {
      // Raw fetch: image generation takes 20-60s, longer than
      // makeAuthenticatedRequest's 15s cap.
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const prompt = imageTweak.trim()
        ? `${text}\n\nArt direction from the user (follow this closely): ${imageTweak.trim()}`
        : text;
      const res = await fetch(buildApiUrl('/api/admin/social/generate-image'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ prompt }),
      });
      const d = await res.json();
      if (!res.ok || !d.url) throw new Error(d?.detail || d?.error || 'generation failed');
      setImageUrl(d.url);
      setStockOpen(false);
      toast.success('🎨 Image generated & attached ✓');
    } catch (e) {
      toast.error(`Image failed: ${e instanceof Error ? e.message : 'unknown'}`);
    } finally {
      setGenerating(false);
    }
  }, [text, imageTweak]);

  const suggestHashtags = useCallback(async () => {
    if (!text.trim()) { toast.error('Write your post first, then add hashtags.'); return; }
    setTagging(true);
    try {
      const res = await auth.makeAuthenticatedRequest('/api/admin/social/hashtags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const d = await res.json();
      const tags: string[] = Array.isArray(d?.hashtags) ? d.hashtags : [];
      if (!res.ok || !tags.length) throw new Error(d?.error || 'no hashtags returned');
      // Append only tags not already in the text.
      const fresh = tags.filter((t) => !text.toLowerCase().includes(t.toLowerCase()));
      if (!fresh.length) { toast('Hashtags already added.'); return; }
      setText((prev) => `${prev.replace(/\s+$/, '')}\n\n${fresh.join(' ')}`);
      toast.success(`Added ${fresh.length} hashtags ✓`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown error';
      toast.error(`Hashtags failed: ${msg}`);
    } finally {
      setTagging(false);
    }
  }, [auth, text]);

  const channels = status?.channels || [];

  return (
    <div className={CARD}>
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-sky-600">share</span>
        <h3 className="text-lg font-bold text-slate-900">📣 Social Auto-Posting</h3>
      </div>
      <p className="text-sm text-slate-500 mb-5">
        Post to LinkedIn &amp; Facebook via Buffer — compose here, or let new blog posts share automatically.
      </p>

      {loading ? (
        <div className="text-sm text-slate-400">Loading…</div>
      ) : !status?.configured ? (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
          <b>Not connected.</b> Set <code>BUFFER_ACCESS_TOKEN</code> and <code>BUFFER_ORG_ID</code> on the
          Render backend, then reload.
        </div>
      ) : (
        <>
          {/* Connection line */}
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            Connected as <b>{status.account?.email || 'Buffer account'}</b>
          </div>

          {channels.length === 0 ? (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
              No channels found. In <b>Buffer → Channels</b>, connect a LinkedIn or Facebook page, then reload.
            </div>
          ) : (
            <>
              {/* Channel checkboxes */}
              <div className="mb-6">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Post to these channels</span>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {channels.map((c) => {
                    const meta = SERVICE_META[c.service || ''] || { icon: '📡', label: c.service || '?', color: 'text-slate-600' };
                    const checked = selected.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${checked ? 'border-sky-400 bg-sky-50' : 'border-slate-200 hover:bg-slate-50'}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleChannel(c.id)}
                          disabled={savingCfg}
                          className="h-4 w-4 rounded border-slate-300 text-sky-600"
                        />
                        <span className="text-lg leading-none">{meta.icon}</span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium text-slate-800 truncate">{c.displayName || c.name || c.id}</span>
                          <span className={`block text-xs ${meta.color}`}>{meta.label}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Auto toggle */}
              <label className="flex items-center gap-3 mb-6 cursor-pointer select-none">
                <button
                  type="button"
                  onClick={onToggleAuto}
                  disabled={savingCfg}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoPost ? 'bg-emerald-500' : 'bg-slate-300'}`}
                  aria-pressed={autoPost}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${autoPost ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm text-slate-700">Auto-share new blog posts to the selected channels</span>
              </label>

              {/* Composer */}
              <div className="border-t border-slate-100 pt-5">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Compose a post</span>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={4}
                  maxLength={3000}
                  placeholder="What do you want to share about HomeListingAI today?"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                {/* Drag-and-drop image */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ''; }}
                />
                {imageUrl ? (
                  <div className="mt-2 rounded-lg border border-slate-200 p-2">
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => setPreviewOpen(true)} title="Click to view full size" className="shrink-0">
                        <img src={imageUrl} alt="attachment preview" className="h-28 w-28 rounded object-cover cursor-zoom-in hover:opacity-90 transition-opacity" />
                      </button>
                      <span className="flex-1 text-xs text-slate-500">Image attached — click it to view full size</span>
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="text-slate-400 hover:text-red-500 text-sm font-medium px-2"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        value={imageTweak}
                        onChange={(e) => setImageTweak(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); generateImage(); } }}
                        placeholder="Tweak it: e.g. 'show a house and a handshake, warmer colors'"
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                      />
                      <button
                        type="button"
                        onClick={generateImage}
                        disabled={generating}
                        className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                      >
                        🎨 {generating ? 'Regenerating…' : 'Regenerate'}
                      </button>
                    </div>
                    {previewOpen && (
                      <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
                        onClick={() => setPreviewOpen(false)}
                      >
                        <img src={imageUrl} alt="full size preview" className="max-h-[85vh] max-w-[90vw] rounded-xl shadow-2xl" />
                        <button
                          type="button"
                          onClick={() => setPreviewOpen(false)}
                          className="absolute top-4 right-5 text-white text-3xl font-bold leading-none"
                          aria-label="Close preview"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={onDrop}
                      className={`mt-2 w-full rounded-lg border-2 border-dashed px-3 py-5 text-sm transition-colors ${dragOver ? 'border-sky-400 bg-sky-50 text-sky-700' : 'border-slate-300 text-slate-500 hover:bg-slate-50'}`}
                    >
                      {uploading ? 'Uploading…' : (
                        <>
                          <span className="material-symbols-outlined align-middle mr-1 text-base">image</span>
                          Drag an image here, or click to add one <span className="text-slate-400">(optional)</span>
                        </>
                      )}
                    </button>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => { setStockOpen((o) => !o); setStockResults([]); }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                      >
                        🔍 Stock photo
                      </button>
                      <button
                        type="button"
                        onClick={generateImage}
                        disabled={generating || !text.trim()}
                        title="Generates a custom graphic from your post text"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors"
                      >
                        🎨 {generating ? 'Generating (~30s, hang tight)…' : 'AI image from post'}
                      </button>
                    </div>
                    {stockOpen && (
                      <div className="mt-2 rounded-lg border border-slate-200 p-3">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={stockQuery}
                            onChange={(e) => setStockQuery(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchStock(); } }}
                            placeholder="e.g. modern home exterior, handshake, house keys"
                            className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                          />
                          <button
                            type="button"
                            onClick={searchStock}
                            disabled={searching}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {searching ? 'Searching…' : 'Search'}
                          </button>
                        </div>
                        {stockResults.length > 0 && (
                          <div className="mt-2 grid grid-cols-3 gap-2">
                            {stockResults.map((img) => (
                              <button
                                key={img.id}
                                type="button"
                                onClick={() => { setImageUrl(img.url); setStockOpen(false); toast.success('Photo attached ✓'); }}
                                className="group relative overflow-hidden rounded-lg border border-slate-200 hover:border-sky-400"
                              >
                                <img src={img.thumb} alt={img.credit} className="h-20 w-full object-cover group-hover:scale-105 transition-transform" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={writeFullPost}
                    disabled={writing || tagging || !text.trim()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                  >
                    🪄 {writing ? 'Writing…' : 'Write full post'}
                  </button>
                  <button
                    type="button"
                    onClick={suggestHashtags}
                    disabled={tagging || writing || !text.trim()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-50 transition-colors"
                  >
                    ✨ {tagging ? 'Picking hashtags…' : 'Add hashtags'}
                  </button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 mt-2">
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <span>Schedule (optional):</span>
                    <input
                      type="datetime-local"
                      value={scheduleAt}
                      onChange={(e) => setScheduleAt(e.target.value)}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                    />
                  </label>
                  <button
                    onClick={submitPost}
                    disabled={posting || !text.trim() || !selected.length}
                    className="inline-flex items-center gap-2 bg-sky-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-sky-700 disabled:opacity-50 transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">send</span>
                    {posting ? 'Posting…' : scheduleAt ? `Schedule (${selected.length})` : `Post to ${selected.length || 0}`}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  No schedule = posts <b>immediately</b>. Pick a date/time to post later instead.
                </p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default AdminSocialPostPanel;
