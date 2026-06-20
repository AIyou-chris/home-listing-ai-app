import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AuthService } from '../../services/authService';

// ── Outreach message templates — EDIT THESE FREELY ─────────────────────────
// Tokens: {{first}} = first name, {{company}} = employer. Keep it short + human.
// A human taps send (Messages / LinkedIn), so this is compliant: not an auto-dialer, not a bot.
const PITCH_URL = 'https://homelistingai.com/for-loan-officers';
const SMS_TEMPLATE =
  `Hey {{first}} — real quick: I built this for loan officers like you. It's an AI concierge that brings you agent partners, warm leads, and your time back. 7 days free, no card needed. 👉 ${PITCH_URL}`;
// Link is included so LinkedIn unfurls a preview card with the site's share image (og-image.png).
const LINKEDIN_TEMPLATE =
  `Hey {{first}} — I built this for loan officers like you: an AI concierge that brings you agent partners, warm leads, and your time back. 7 days free, no card needed. Take a look 👉 ${PITCH_URL}`;

type Lead = {
  id: string;
  email: string;
  name: string | null;
  employer: string | null;
  job_title: string | null;
  phone: string | null;
  linkedin: string | null;
  city: string | null;
  source_url: string | null;
  is_role: boolean;
  status: string;            // new | sent | skipped
  found_at: string;
  sent_at: string | null;
};

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';

const firstNameOf = (name: string | null) => (name || '').trim().split(/\s+/)[0] || 'there';
const fillTemplate = (tpl: string, l: Lead) =>
  tpl.replace(/\{\{first\}\}/g, firstNameOf(l.name)).replace(/\{\{company\}\}/g, l.employer || 'your team');

const STATUS_TABS: Array<{ key: string; label: string }> = [
  { key: 'new', label: 'New' },
  { key: 'sent', label: 'Sent' },
  { key: 'skipped', label: 'Skipped' },
];

const AdminLoLeadFinderPanel: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('new');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [datasetId, setDatasetId] = useState('');
  const [msg, setMsg] = useState('');

  const auth = useMemo(() => AuthService.getInstance(), []);

  const load = useCallback(async (status: string) => {
    setLoading(true);
    setSelected(new Set());
    try {
      const res = await auth.makeAuthenticatedRequest(`/api/admin/lo-leads?status=${encodeURIComponent(status)}`);
      const d = await res.json() as { leads?: Lead[] };
      setLeads(d.leads || []);
    } catch (e) {
      console.error('[LO Lead Finder] load failed', e);
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => { void load(statusFilter); }, [load, statusFilter]);

  const importApify = async () => {
    if (importing) return;
    setImporting(true);
    setMsg('');
    try {
      const res = await auth.makeAuthenticatedRequest('/api/admin/lo-leads/import-apify', {
        method: 'POST',
        body: JSON.stringify(datasetId.trim() ? { datasetId: datasetId.trim() } : {}),
      });
      const d = await res.json() as { success?: boolean; rowsFetched?: number; leadsAdded?: number; dupesSkipped?: number; skipped?: string };
      if (!res.ok || !d.success) { setMsg(d.skipped === 'missing_apify_token' ? '⚠️ No Apify token set on the server.' : "❌ Import failed."); return; }
      setMsg(`✅ Imported ${d.leadsAdded ?? 0} new leads (${d.rowsFetched ?? 0} scanned, ${d.dupesSkipped ?? 0} dupes).`);
      setDatasetId('');
      setStatusFilter('new');
      await load('new');
    } catch {
      setMsg('❌ Import failed.');
    } finally {
      setImporting(false);
    }
  };

  const sendOne = async (id: string) => {
    setRowBusy(id);
    try {
      const res = await auth.makeAuthenticatedRequest(`/api/admin/lo-leads/${id}/send`, { method: 'POST' });
      const d = await res.json() as { success?: boolean; error?: string };
      if (!res.ok || !d.success) { setMsg(d.error === 'suppressed' ? '⚠️ That email is on the suppression list.' : '❌ Send failed.'); return; }
      setLeads(prev => prev.filter(l => l.id !== id));
    } catch {
      setMsg('❌ Send failed.');
    } finally {
      setRowBusy(null);
    }
  };

  // ── Outreach assistant — human taps send (no auto-dialer, no bot) ──
  const textLead = (l: Lead) => {
    const body = fillTemplate(SMS_TEMPLATE, l);
    void navigator.clipboard?.writeText(body).catch(() => {});
    if (l.phone) {
      const num = l.phone.replace(/[^\d+]/g, '');
      window.open(`sms:${num}?&body=${encodeURIComponent(body)}`, '_self');
    }
    toast.success('Text copied — Messages opening');
  };

  const dmLead = (l: Lead) => {
    const body = fillTemplate(LINKEDIN_TEMPLATE, l);
    void navigator.clipboard?.writeText(body).catch(() => {});
    if (l.linkedin) window.open(l.linkedin, '_blank', 'noopener');
    toast.success('DM copied — paste it in LinkedIn');
  };

  const skip = async (id: string) => {
    setRowBusy(id);
    try {
      await auth.makeAuthenticatedRequest(`/api/admin/lo-leads/${id}/skip`, { method: 'POST' });
      setLeads(prev => prev.filter(l => l.id !== id));
    } catch {
      setMsg('❌ Skip failed.');
    } finally {
      setRowBusy(null);
    }
  };

  const sendBulk = async () => {
    const ids = Array.from(selected);
    const count = ids.length;
    const scope = count > 0 ? `${count} selected lead${count === 1 ? '' : 's'}` : 'ALL new leads';
    if (!window.confirm(`Send the LO Acquisition Link to ${scope}? Role/catch-all addresses (info@…) are skipped automatically.`)) return;
    setBulkSending(true);
    setMsg('');
    try {
      const body = count > 0 ? { ids } : { all: true };
      const res = await auth.makeAuthenticatedRequest('/api/admin/lo-leads/send-bulk', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const d = await res.json() as { success?: boolean; sent?: number; skipped?: number };
      if (!res.ok || !d.success) { setMsg('❌ Bulk send failed.'); return; }
      setMsg(`✅ Sent ${d.sent ?? 0} acquisition links (${d.skipped ?? 0} skipped).`);
      await load(statusFilter);
    } catch {
      setMsg('❌ Bulk send failed.');
    } finally {
      setBulkSending(false);
    }
  };

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const isNew = statusFilter === 'new';

  return (
    <div className="space-y-6 px-4 md:px-0">
      {/* Import card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">🧲 LO Lead Finder</h2>
        <p className="mt-1 text-sm text-slate-500">
          Run the leads-finder in Apify (free plan: click <span className="font-semibold">Start</span>, 100 leads/run), then import the result here.
          Review the pool, then send your LO Acquisition Link.
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Apify dataset ID (optional — blank = your last run)"
            value={datasetId}
            onChange={e => setDatasetId(e.target.value)}
          />
          <button
            onClick={importApify}
            disabled={importing}
            className="rounded-xl bg-primary-600 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-primary-700 disabled:opacity-50"
          >
            {importing ? 'Importing…' : '⬇️ Import from Apify'}
          </button>
        </div>
        {msg && <p className="mt-3 text-sm font-semibold text-slate-700">{msg}</p>}
      </div>

      {/* Pool table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {STATUS_TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setStatusFilter(t.key)}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${statusFilter === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {isNew && leads.length > 0 && (
            <button
              onClick={sendBulk}
              disabled={bulkSending}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 disabled:opacity-50"
            >
              {bulkSending ? 'Sending…' : selected.size > 0 ? `🚀 Send to ${selected.size} selected` : '🚀 Send to all new'}
            </button>
          )}
        </div>

        {loading ? (
          <p className="px-6 py-10 text-center text-sm text-slate-400">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  {isNew && <th className="w-10 px-4 py-3" />}
                  {['Loan Officer', 'Email', 'Company', 'Phone', 'Links', isNew ? 'Actions' : 'Date'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    {isNew && (
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggle(l.id)} className="h-4 w-4 rounded border-slate-300" />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{l.name || '—'}</p>
                      <p className="text-xs text-slate-400">{l.job_title || ''}{l.is_role && <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">role</span>}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{l.email}</td>
                    <td className="px-4 py-3">
                      <p className="text-slate-600">{l.employer || '—'}</p>
                      <p className="text-xs text-slate-400">{l.city || ''}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{l.phone || '—'}</td>
                    <td className="px-4 py-3 text-xs">
                      {l.linkedin && <a href={l.linkedin} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline">LinkedIn</a>}
                      {l.linkedin && l.source_url && <span className="text-slate-300"> · </span>}
                      {l.source_url && <a href={l.source_url} target="_blank" rel="noreferrer" className="text-slate-500 hover:underline">Site</a>}
                    </td>
                    {isNew ? (
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <button onClick={() => textLead(l)} disabled={!l.phone} title={l.phone ? 'Open Messages with a ready-to-send text' : 'No phone number'} className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-40">💬 Text</button>
                          <button onClick={() => dmLead(l)} disabled={!l.linkedin} title={l.linkedin ? 'Copy the DM + open their LinkedIn' : 'No LinkedIn'} className="rounded-lg bg-sky-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-sky-700 disabled:opacity-40">🔗 DM</button>
                          <button onClick={() => sendOne(l.id)} disabled={rowBusy === l.id} title="Email the acquisition link (use sparingly — cold email risks spam)" className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-50">Email</button>
                          <button onClick={() => skip(l.id)} disabled={rowBusy === l.id} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-400 hover:bg-slate-100 disabled:opacity-50">Skip</button>
                        </div>
                      </td>
                    ) : (
                      <td className="px-4 py-3 text-xs text-slate-400">{fmt(l.sent_at || l.found_at)}</td>
                    )}
                  </tr>
                ))}
                {leads.length === 0 && (
                  <tr><td colSpan={isNew ? 7 : 6} className="px-4 py-10 text-center text-slate-400">
                    {statusFilter === 'new' ? 'No new leads. Import a run above to fill the pool.' : `No ${statusFilter} leads.`}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLoLeadFinderPanel;
