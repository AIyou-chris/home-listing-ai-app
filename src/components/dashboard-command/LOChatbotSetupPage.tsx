import React, { useEffect, useRef, useState } from 'react';
import { buildApiUrl } from '../../lib/api';
import { supabase } from '../../services/supabase';
import toast from 'react-hot-toast';

const getApiHeaders = async (): Promise<HeadersInit> => {
  const { data } = await supabase.auth.getUser();
  return {
    'Content-Type': 'application/json',
    ...(data.user?.id ? { 'x-user-id': data.user.id } : {})
  };
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

interface ChatbotConfig {
  bot_name: string;
  greeting: string;
  personality: string;
  knowledge_base: string;
  faq: FaqItem[];
  is_active: boolean;
}

// ─── Knowledge Base Section ───────────────────────────────────────────────────

type KbTab = 'text' | 'file' | 'url';

const KnowledgeBaseSection: React.FC<{
  value: string;
  onChange: (text: string) => void;
  getHeaders: () => Promise<HeadersInit>;
}> = ({ value, onChange, getHeaders }) => {
  const [tab, setTab] = useState<KbTab>('text');
  const [urlInput, setUrlInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const appendText = (newText: string) => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    onChange(value ? `${value}\n\n---\n\n${trimmed}` : trimmed);
    toast.success('Added to knowledge base');
  };

  const scanUrl = async () => {
    const url = urlInput.trim();
    if (!url) return;
    setScanning(true);
    try {
      const headers = await getHeaders();
      const res = await fetch(buildApiUrl('/api/lo/chatbot/extract-url'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to scan');
      appendText(`[From: ${url}]\n${data.text}`);
      setUrlInput('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not scan that URL');
    } finally {
      setScanning(false);
    }
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const headers = await getHeaders();
      // Remove Content-Type so browser sets multipart boundary
      const headerEntries = Object.entries(headers as Record<string, string>).filter(([k]) => k.toLowerCase() !== 'content-type');
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(buildApiUrl('/api/lo/chatbot/extract-file'), {
        method: 'POST',
        headers: Object.fromEntries(headerEntries),
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to extract file');
      appendText(`[From: ${file.name}]\n${data.text}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not read that file');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const TABS: { id: KbTab; label: string; icon: string }[] = [
    { id: 'text', label: 'Paste Text', icon: 'edit_note' },
    { id: 'file', label: 'Upload File', icon: 'upload_file' },
    { id: 'url', label: 'Scan Website', icon: 'travel_explore' }
  ];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
        <span className="material-symbols-outlined text-base text-emerald-500">library_books</span>
        Knowledge Base
      </h2>

      {/* Tabs */}
      <div className="mb-4 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              tab === t.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-sm">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Paste Text */}
      {tab === 'text' && (
        <div>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Paste your rate sheet, loan programs, down payment assistance info, or any other content you want the bot to reference..."
            rows={8}
            className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
          />
          <p className="mt-1 text-xs text-slate-400">
            Paste rate sheets, program details, eligibility — anything you want the bot to know.
          </p>
        </div>
      )}

      {/* Upload File */}
      {tab === 'file' && (
        <div>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) void uploadFile(file);
            }}
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 transition hover:border-emerald-400 hover:bg-emerald-50"
          >
            {uploading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-3xl text-emerald-500">progress_activity</span>
                <p className="text-sm font-medium text-slate-600">Extracting text...</p>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-3xl text-slate-400">upload_file</span>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-700">Drop a file here or click to browse</p>
                  <p className="mt-1 text-xs text-slate-400">Supports PDF, TXT, CSV — up to 10MB</p>
                </div>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.txt,.csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadFile(file);
            }}
          />
          {value && (
            <p className="mt-2 text-xs text-emerald-600">
              ✓ {value.length.toLocaleString()} characters in knowledge base
            </p>
          )}
        </div>
      )}

      {/* Scan Website */}
      {tab === 'url' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void scanUrl(); } }}
              placeholder="https://yoursite.com/loan-programs"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100"
            />
            <button
              onClick={() => void scanUrl()}
              disabled={scanning || !urlInput.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {scanning ? (
                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-sm">travel_explore</span>
              )}
              {scanning ? 'Scanning...' : 'Scan'}
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Enter a URL and we'll extract the text content — great for loan program pages, rate sheets, or your company bio.
          </p>
          {value && (
            <p className="text-xs text-emerald-600">
              ✓ {value.length.toLocaleString()} characters in knowledge base
            </p>
          )}
        </div>
      )}

      {/* Current KB preview (shown when not in text mode) */}
      {tab !== 'text' && value && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold text-slate-500">Current Knowledge Base</p>
            <button
              onClick={() => { if (window.confirm('Clear the entire knowledge base?')) onChange(''); }}
              className="text-xs text-rose-500 hover:underline"
            >
              Clear all
            </button>
          </div>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={5}
            className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 outline-none transition focus:border-slate-300"
          />
        </div>
      )}
    </section>
  );
};

// ─── Listing KB Section ───────────────────────────────────────────────────────

interface ListingDoc {
  id: string;
  address: string;
  label: string | null;
  content: string;
  created_at: string;
}

// Helper: format payment fields into a clean content block
const formatPaymentBlock = (p: {
  loanProgram: string; rate: string; apr: string; downPct: string; monthlyPayment: string;
}): string => {
  const lines: string[] = ['--- Payment Details ---'];
  if (p.loanProgram) lines.push(`Loan Program: ${p.loanProgram}`);
  if (p.rate) lines.push(`Interest Rate: ${p.rate}%`);
  if (p.apr) lines.push(`APR: ${p.apr}%`);
  if (p.downPct) lines.push(`Down Payment: ${p.downPct}%`);
  if (p.monthlyPayment) lines.push(`Est. Monthly Payment (PITI): $${p.monthlyPayment}/mo`);
  return lines.join('\n');
};

const LOAN_PROGRAMS = ['FHA', 'Conventional', 'VA', 'USDA', 'Jumbo', 'Other'];

const EMPTY_FORM = {
  address: '', label: '', notes: '',
  loanProgram: '', rate: '', apr: '', downPct: '', monthlyPayment: '',
};

const _ListingKnowledgeSection: React.FC<{
  getHeaders: () => Promise<HeadersInit>;
}> = ({ getHeaders }) => {
  const [docs, setDocs] = useState<ListingDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ address: '', label: '', content: '' });
  const [editSaving, setEditSaving] = useState(false);

  const load = async () => {
    try {
      const headers = await getHeaders();
      const res = await fetch(buildApiUrl('/api/lo/chatbot/listing-docs'), { headers });
      if (res.ok) {
        const data = await res.json();
        setDocs(data.docs || []);
      }
    } catch (err) {
      console.error('[ListingKB] load error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!form.address.trim()) {
      toast.error('Property address is required.');
      return;
    }
    const hasPayment = form.loanProgram || form.rate || form.apr || form.downPct || form.monthlyPayment;
    const hasNotes = form.notes.trim();
    if (!hasPayment && !hasNotes) {
      toast.error('Add payment details or notes — at least one is required.');
      return;
    }

    // Build content: payment block first (if any), then notes
    const parts: string[] = [];
    if (hasPayment) parts.push(formatPaymentBlock({
      loanProgram: form.loanProgram, rate: form.rate, apr: form.apr,
      downPct: form.downPct, monthlyPayment: form.monthlyPayment,
    }));
    if (hasNotes) parts.push(form.notes.trim());
    const content = parts.join('\n\n');

    setSaving(true);
    try {
      const headers = await getHeaders();
      const res = await fetch(buildApiUrl('/api/lo/chatbot/listing-docs'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ address: form.address, label: form.label || null, content })
      });
      const responseText = await res.text();
      if (!res.ok) {
        console.error('[ListingKB] save failed', res.status, responseText);
        throw new Error('save_failed');
      }
      setForm(EMPTY_FORM);
      setShowPayment(false);
      setAdding(false);
      toast.success('Listing saved!');
      await load();
    } catch (err) {
      console.error('[ListingKB] save error', err);
      toast.error('Could not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this listing from the knowledge base?')) return;
    setDeleting(id);
    try {
      const headers = await getHeaders();
      const res = await fetch(buildApiUrl(`/api/lo/chatbot/listing-docs/${id}`), {
        method: 'DELETE',
        headers
      });
      if (!res.ok) throw new Error('delete_failed');
      setDocs((prev) => prev.filter((d) => d.id !== id));
      toast.success('Removed.');
    } catch {
      toast.error('Could not delete. Try again.');
    } finally {
      setDeleting(null);
    }
  };

  const cancelAdd = () => {
    setAdding(false);
    setShowPayment(false);
    setForm(EMPTY_FORM);
  };

  const startEdit = (doc: ListingDoc) => {
    setEditingId(doc.id);
    setEditForm({ address: doc.address, label: doc.label || '', content: doc.content });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ address: '', label: '', content: '' });
  };

  const handleEditSave = async (id: string) => {
    if (!editForm.address.trim() || !editForm.content.trim()) {
      toast.error('Address and notes are required.');
      return;
    }
    setEditSaving(true);
    try {
      const headers = await getHeaders();
      const res = await fetch(buildApiUrl(`/api/lo/chatbot/listing-docs/${id}`), {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ address: editForm.address, label: editForm.label || null, content: editForm.content })
      });
      if (!res.ok) throw new Error('update_failed');
      cancelEdit();
      toast.success('Updated!');
      await load();
    } catch {
      toast.error('Could not update. Try again.');
    } finally {
      setEditSaving(false);
    }
  };

  // Detect if a doc has payment details stored
  const hasPaymentInfo = (content: string) => content.includes('--- Payment Details ---');

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
          <span className="material-symbols-outlined text-base text-violet-500">home_pin</span>
          Listing-Specific Knowledge
        </h2>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Add listing
          </button>
        )}
      </div>

      <p className="mb-4 text-xs text-slate-500">
        Add notes and payment details for a specific property. The bot references them only when someone chats on that listing.
      </p>

      {/* Add form */}
      {adding && (
        <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50 p-4 space-y-4">
          {/* Address + Label */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Property Address *</label>
              <input
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="123 Main St, Austin TX"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-1 focus:ring-violet-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Label (optional)</label>
              <input
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="e.g. FHA approved, Seller concessions"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-1 focus:ring-violet-100"
              />
            </div>
          </div>

          {/* Payment Details toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowPayment((v) => !v)}
              className="flex items-center gap-2 text-xs font-semibold text-violet-700 hover:text-violet-900 transition"
            >
              <span className="material-symbols-outlined text-sm">
                {showPayment ? 'expand_less' : 'expand_more'}
              </span>
              <span className="material-symbols-outlined text-sm">payments</span>
              {showPayment ? 'Hide payment details' : '+ Add payment & APR details'}
            </button>

            {showPayment && (
              <div className="mt-3 rounded-xl border border-violet-300 bg-white p-4 space-y-3">
                <p className="text-xs text-slate-500">These details will be included in the bot's context for this listing.</p>
                {/* Loan Program */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Loan Program</label>
                  <select
                    value={form.loanProgram}
                    onChange={(e) => setForm((f) => ({ ...f, loanProgram: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-1 focus:ring-violet-100"
                  >
                    <option value="">Select program...</option>
                    {LOAN_PROGRAMS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                {/* Rate / APR */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Interest Rate (%)</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        max="30"
                        value={form.rate}
                        onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
                        placeholder="6.875"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-7 text-sm outline-none transition focus:border-violet-400 focus:ring-1 focus:ring-violet-100"
                      />
                      <span className="absolute right-2.5 top-2 text-xs text-slate-400 pointer-events-none">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">APR (%)</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        max="30"
                        value={form.apr}
                        onChange={(e) => setForm((f) => ({ ...f, apr: e.target.value }))}
                        placeholder="7.12"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-7 text-sm outline-none transition focus:border-violet-400 focus:ring-1 focus:ring-violet-100"
                      />
                      <span className="absolute right-2.5 top-2 text-xs text-slate-400 pointer-events-none">%</span>
                    </div>
                  </div>
                </div>
                {/* Down % / Monthly Payment */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Down Payment (%)</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={form.downPct}
                        onChange={(e) => setForm((f) => ({ ...f, downPct: e.target.value }))}
                        placeholder="3.5"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-7 text-sm outline-none transition focus:border-violet-400 focus:ring-1 focus:ring-violet-100"
                      />
                      <span className="absolute right-2.5 top-2 text-xs text-slate-400 pointer-events-none">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Monthly Payment (PITI) $</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs text-slate-400 pointer-events-none">$</span>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={form.monthlyPayment}
                        onChange={(e) => setForm((f) => ({ ...f, monthlyPayment: e.target.value }))}
                        placeholder="2847"
                        className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-6 pr-3 text-sm outline-none transition focus:border-violet-400 focus:ring-1 focus:ring-violet-100"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="HOA is $220/mo, seller paying 2 points, FHA approved, 3.5% down works, special financing available..."
              rows={4}
              className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-1 focus:ring-violet-100"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={cancelAdd}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
            >
              {saving ? (
                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-sm">save</span>
              )}
              {saving ? 'Saving...' : 'Save listing notes'}
            </button>
          </div>
        </div>
      )}

      {/* Doc list */}
      {loading ? (
        <p className="text-xs text-slate-400 py-4 text-center">Loading...</p>
      ) : docs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center">
          <span className="material-symbols-outlined text-3xl text-slate-300">home_pin</span>
          <p className="mt-2 text-sm text-slate-400 font-medium">No listing notes yet</p>
          <p className="text-xs text-slate-400 mt-1">Add payment details or notes for a listing — the bot will reference them automatically.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {docs.map((doc) => {
            const withPayment = hasPaymentInfo(doc.content);
            const previewText = doc.content.replace('--- Payment Details ---\n', '').trim();
            const isEditing = editingId === doc.id;

            return (
              <li key={doc.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                {isEditing ? (
                  /* ── Inline edit form ── */
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">Address *</label>
                        <input
                          value={editForm.address}
                          onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">Label (optional)</label>
                        <input
                          value={editForm.label}
                          onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">Notes / Payment Details *</label>
                      <textarea
                        value={editForm.content}
                        onChange={(e) => setEditForm((f) => ({ ...f, content: e.target.value }))}
                        rows={6}
                        className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={cancelEdit} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
                      <button
                        onClick={() => void handleEditSave(doc.id)}
                        disabled={editSaving}
                        className="flex items-center gap-1 rounded-lg bg-violet-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                      >
                        {editSaving ? <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span> : <span className="material-symbols-outlined text-sm">save</span>}
                        {editSaving ? 'Saving…' : 'Save changes'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Doc row ── */
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="material-symbols-outlined text-sm text-violet-500">home_pin</span>
                        <p className="text-sm font-semibold text-slate-900 truncate">{doc.address}</p>
                        {doc.label && (
                          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">{doc.label}</span>
                        )}
                        {withPayment && (
                          <span className="flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            <span className="material-symbols-outlined text-[10px]">payments</span>
                            Payment info
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2">{previewText}</p>
                      <p className="mt-1 text-[10px] text-slate-400">{new Date(doc.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-1">
                      <button
                        onClick={() => startEdit(doc)}
                        title="Edit"
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-violet-50 hover:text-violet-600"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button
                        onClick={() => void handleDelete(doc.id)}
                        disabled={deleting === doc.id}
                        title="Remove — house sold or no longer needed"
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50"
                      >
                        {deleting === doc.id
                          ? <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                          : <span className="material-symbols-outlined text-sm">delete</span>
                        }
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

// ─── Preview ─────────────────────────────────────────────────────────────────

const BotPreview: React.FC<{ config: ChatbotConfig }> = ({ config }) => {
  const [messages, setMessages] = useState<{ role: 'visitor' | 'bot'; text: string }[]>([
    { role: 'bot', text: config.greeting || 'Hi! I can answer your financing questions.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([{ role: 'bot', text: config.greeting || 'Hi! I can answer your financing questions.' }]);
  }, [config.greeting]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async (text: string) => {
    const clean = text.trim();
    if (!clean || loading) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'visitor', text: clean }]);
    setLoading(true);

    // Simulate response using FAQ or generic fallback in preview
    await new Promise((resolve) => setTimeout(resolve, 700));
    const faqMatch = config.faq.find((f) =>
      clean.toLowerCase().includes(f.question.toLowerCase().slice(0, 15))
    );
    const reply = faqMatch
      ? faqMatch.answer
      : "Great question! I'd love to walk you through the details — please reach out directly and I can give you personalized numbers.";
    setMessages((prev) => [...prev, { role: 'bot', text: reply }]);
    setLoading(false);
  };

  return (
    <div className="flex h-[480px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-700 to-teal-600 px-4 py-3 text-white">
        <p className="text-sm font-bold">{config.bot_name || 'Your Loan Officer'}</p>
        <p className="text-xs text-emerald-100">Financing Assistant • Preview</p>
      </div>

      {/* Transcript */}
      <div ref={transcriptRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'visitor' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                m.role === 'visitor'
                  ? 'rounded-br-sm bg-slate-900 text-white'
                  : 'rounded-tl-sm border border-slate-200 bg-white text-slate-800 shadow-sm'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="w-fit rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-400 shadow-sm">
            Thinking...
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 px-3 py-2">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void send(input); } }}
            placeholder="Ask a financing question..."
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-400"
          />
          <button
            onClick={() => void send(input)}
            disabled={loading}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const LOChatbotSetupPage: React.FC = () => {
  const [config, setConfig] = useState<ChatbotConfig>({
    bot_name: '',
    greeting: '',
    personality: '',
    knowledge_base: '',
    faq: [],
    is_active: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Load existing config ──────────────────────────────────────────────────
  useEffect(() => {
    const fetch_ = async () => {
      try {
        const headers = await getApiHeaders();
        const res = await fetch(buildApiUrl('/api/lo/chatbot-config'), { headers });
        if (res.ok) {
          const data = await res.json();
          setConfig({
            bot_name: data.bot_name || '',
            greeting: data.greeting || '',
            personality: data.personality || '',
            knowledge_base: data.knowledge_base || '',
            faq: Array.isArray(data.faq) ? data.faq.map((f: Omit<FaqItem, 'id'> & { id?: string }) => ({
              ...f,
              id: f.id || crypto.randomUUID()
            })) : [],
            is_active: data.is_active !== false
          });
        }
      } catch (err) {
        console.error('[LOChatbotSetupPage] load error', err);
      } finally {
        setLoading(false);
      }
    };
    void fetch_();
  }, []);

  // ── Save ─────────────────────────────────────────────────────────────────
  const save = async () => {
    setSaving(true);
    try {
      const headers = await getApiHeaders();
      const res = await fetch(buildApiUrl('/api/lo/chatbot-config'), {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          ...config,
          faq: config.faq.map(({ question, answer }) => ({ question, answer }))
        })
      });
      if (!res.ok) throw new Error('save_failed');
      toast.success('Chatbot saved!');
    } catch {
      toast.error('Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── FAQ helpers ───────────────────────────────────────────────────────────
  const addFaq = () =>
    setConfig((c) => ({
      ...c,
      faq: [...c.faq, { id: crypto.randomUUID(), question: '', answer: '' }]
    }));

  const updateFaq = (id: string, field: 'question' | 'answer', value: string) =>
    setConfig((c) => ({
      ...c,
      faq: c.faq.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    }));

  const removeFaq = (id: string) =>
    setConfig((c) => ({ ...c, faq: c.faq.filter((f) => f.id !== id) }));

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400 text-sm">
        Loading chatbot config...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI Financing Bot</h1>
          <p className="mt-1 text-sm text-slate-500">
            Train your bot to answer mortgage and financing questions on your listing pages.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
            <div
              onClick={() => setConfig((c) => ({ ...c, is_active: !c.is_active }))}
              className={`relative h-5 w-9 rounded-full transition-colors ${
                config.is_active ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  config.is_active ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </div>
            <span className="font-medium">{config.is_active ? 'Active' : 'Off'}</span>
          </label>
          <button
            onClick={() => void save()}
            disabled={saving}
            className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Left: Config */}
        <div className="space-y-6">

          {/* Bot Identity */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
              <span className="material-symbols-outlined text-base text-emerald-500">smart_toy</span>
              Bot Identity
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Bot Name</label>
                <input
                  value={config.bot_name}
                  onChange={(e) => setConfig((c) => ({ ...c, bot_name: e.target.value }))}
                  placeholder="e.g. Jake's Financing Assistant"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Opening Greeting</label>
                <textarea
                  value={config.greeting}
                  onChange={(e) => setConfig((c) => ({ ...c, greeting: e.target.value }))}
                  placeholder="Hi! I can answer your mortgage and financing questions..."
                  rows={3}
                  className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                />
                <p className="mt-1 text-xs text-slate-400">This is the first message visitors see when they open the chat.</p>
              </div>
            </div>
          </section>

          {/* Personality */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
              <span className="material-symbols-outlined text-base text-emerald-500">psychology</span>
              Personality & Tone
            </h2>
            <textarea
              value={config.personality}
              onChange={(e) => setConfig((c) => ({ ...c, personality: e.target.value }))}
              placeholder="Professional and friendly mortgage advisor. Use simple language. Always encourage visitors to reach out directly for personalized rates..."
              rows={4}
              className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
            />
            <p className="mt-1 text-xs text-slate-400">Describe how you want the bot to communicate. This shapes every reply.</p>
          </section>

          {/* Knowledge Base */}
          <KnowledgeBaseSection
            value={config.knowledge_base}
            onChange={(text) => setConfig((c) => ({ ...c, knowledge_base: text }))}
            getHeaders={getApiHeaders}
          />

          {/* FAQ */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                <span className="material-symbols-outlined text-base text-emerald-500">quiz</span>
                FAQ Pairs
              </h2>
              <button
                onClick={addFaq}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Add Question
              </button>
            </div>

            {config.faq.length === 0 && (
              <p className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-xs text-slate-400">
                No FAQ pairs yet. Add common financing questions visitors ask.
              </p>
            )}

            <div className="space-y-4">
              {config.faq.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Q&A Pair</span>
                    <button
                      onClick={() => removeFaq(item.id)}
                      className="rounded p-0.5 text-slate-400 transition hover:bg-slate-200 hover:text-rose-500"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                  <input
                    value={item.question}
                    onChange={(e) => updateFaq(item.id, 'question', e.target.value)}
                    placeholder="Question (e.g. What's the minimum down payment?)"
                    className="mb-2 w-full rounded border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none transition focus:border-primary-400"
                  />
                  <textarea
                    value={item.answer}
                    onChange={(e) => updateFaq(item.id, 'answer', e.target.value)}
                    placeholder="Answer..."
                    rows={2}
                    className="w-full resize-none rounded border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none transition focus:border-primary-400"
                  />
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right: Preview */}
        <div className="lg:sticky lg:top-8">
          <div className="mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-slate-400">preview</span>
            <p className="text-sm font-semibold text-slate-600">Live Preview</p>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
              Simulated
            </span>
          </div>
          <BotPreview config={config} />
          <p className="mt-3 text-xs text-slate-400 text-center">
            Preview uses FAQ matching only. Live bot uses OpenAI with your full knowledge base.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LOChatbotSetupPage;
