import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AuthService } from '../../services/authService';

// ── Outreach message templates — EDIT THESE FREELY ─────────────────────────
// Tokens: {{first}} = first name, {{company}} = employer. Keep it short + human.
// A human taps send (Messages / LinkedIn), so this is compliant: not an auto-dialer, not a bot.
const PITCH_URL = 'https://homelistingai.com/for-loan-officers';
const SMS_TEMPLATE =
  `Hey {{first}} — it's looking like 2006 out there. I built HomeListingAI for loan officers like you: warm leads, agent partners who actually stick, and your time back. 7 days free, no card. 👉 ${PITCH_URL}`;
// Fits LinkedIn's 300-char connection-request note limit. The domain is plain
// text (notes don't make links clickable) but readers can type/search it.
const LINKEDIN_TEMPLATE =
  `Hey {{first}} — it's looking like 2006 out there. I built HomeListingAI for loan officers like you: warm leads, agent partners who stick, your time back. 7 days free, no card. Open to a quick look? homelistingai.com`;

// Minimal RFC-4180-ish CSV parser: handles quoted fields, embedded commas/newlines,
// and escaped quotes. Returns an array of objects keyed by the header row.
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cur: string[] = [], field = '', inQuotes = false;
  const t = text.replace(/^/, ''); // strip BOM
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (inQuotes) {
      if (ch === '"') { if (t[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += ch;
    } else if (ch === '"') { inQuotes = true; }
    else if (ch === ',') { cur.push(field); field = ''; }
    else if (ch === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; }
    else if (ch !== '\r') { field += ch; }
  }
  if (field !== '' || cur.length) { cur.push(field); rows.push(cur); }
  if (rows.length < 2) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1)
    .filter(r => r.some(c => c.trim() !== ''))
    .map(r => {
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => { obj[h] = (r[idx] ?? '').trim(); });
      return obj;
    });
}

type Lead = {
  id: string;
  email: string | null;      // null = LinkedIn-only lead (work it via the DM queue)
  name: string | null;
  employer: string | null;
  job_title: string | null;
  phone: string | null;
  linkedin: string | null;
  city: string | null;
  source_url: string | null;
  is_role: boolean;
  status: string;            // new | sent | dm_sent | skipped
  found_at: string;
  sent_at: string | null;
};

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';

// CSV/scraped URLs often lack a protocol (e.g. "linkedin.com/in/x"), which the
// browser treats as a relative path → 404. Force an absolute https:// URL.
const absUrl = (u: string | null) => {
  if (!u) return null;
  const t = u.trim();
  return /^https?:\/\//i.test(t) ? t : `https://${t.replace(/^\/+/, '')}`;
};

const firstNameOf = (name: string | null) => (name || '').trim().split(/\s+/)[0] || 'there';
const fillTemplate = (tpl: string, l: Lead) =>
  tpl.replace(/\{\{first\}\}/g, firstNameOf(l.name)).replace(/\{\{company\}\}/g, l.employer || 'your team');

const STATUS_TABS: Array<{ key: string; label: string }> = [
  { key: 'new', label: 'New' },
  { key: 'sent', label: 'Emailed' },
  { key: 'dm_sent', label: "DM'd" },
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
  const [poolOpen, setPoolOpen] = useState(true);
  const [finding, setFinding] = useState(false);
  const [dmQueue, setDmQueue] = useState<Lead[] | null>(null); // null = closed

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

  const importCsv = async (file: File) => {
    if (importing) return;
    setImporting(true);
    setMsg('');
    try {
      const rows = parseCsv(await file.text());
      if (!rows.length) { setMsg('❌ No rows found in that CSV.'); return; }
      const res = await auth.makeAuthenticatedRequest('/api/admin/lo-leads/import-csv', {
        method: 'POST',
        body: JSON.stringify({ rows }),
      });
      const d = await res.json() as { success?: boolean; rowsReceived?: number; leadsAdded?: number; dupesSkipped?: number };
      if (!res.ok || !d.success) { setMsg('❌ CSV import failed.'); return; }
      setMsg(`✅ Imported ${d.leadsAdded ?? 0} new leads from CSV (${d.rowsReceived ?? 0} rows, ${d.dupesSkipped ?? 0} skipped as dupes/no-email).`);
      setStatusFilter('new');
      await load('new');
    } catch {
      setMsg('❌ CSV import failed.');
    } finally {
      setImporting(false);
    }
  };

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

  // One-click LinkedIn search via the HarvestAPI actor (pay-per-event — runs
  // fine on the free Apify plan, unlike the rental leads-finder).
  const findOnLinkedIn = async () => {
    if (finding) return;
    if (!window.confirm('Search LinkedIn for 50 US loan officers now? Costs a few dollars of Apify credit and takes 1–3 minutes.')) return;
    setFinding(true);
    setMsg('🔎 Searching LinkedIn… this takes 1–3 minutes, leave this tab open.');
    try {
      const res = await auth.makeAuthenticatedRequest('/api/admin/lo-leads/run', {
        method: 'POST',
        body: JSON.stringify({ engine: 'harvest', fetchCount: 50 }),
      });
      const d = await res.json() as { success?: boolean; leadsAdded?: number; dupesSkipped?: number; rowsFetched?: number; skipped?: string; error?: string };
      if (!res.ok || !d.success || d.error) {
        setMsg(d.skipped === 'missing_apify_token' ? '⚠️ No Apify token set on the server.' : '❌ LinkedIn search failed — check the Apify console for the run, then import it above.');
        return;
      }
      setMsg(`✅ Found ${d.leadsAdded ?? 0} new US loan officers (${d.rowsFetched ?? 0} profiles scanned, ${d.dupesSkipped ?? 0} already in your pool).`);
      setStatusFilter('new');
      await load('new');
    } catch {
      // The proxy can time out before Apify finishes — the search usually still
      // completes and saves in the background.
      setMsg('⏳ Still working in the background… tap the New tab again in 2–3 minutes and your leads should be there.');
    } finally {
      setFinding(false);
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
    const url = absUrl(l.linkedin);
    if (url) window.open(url, '_blank', 'noopener');
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

  // ── DM Queue — rapid-fire LinkedIn connection notes, one lead at a time.
  // The note is pre-copied and the profile opens in a new tab; a human taps
  // Connect + paste + send on LinkedIn, then marks it done here. No bot.
  const dmQueueCurrent = dmQueue && dmQueue.length ? dmQueue[0] : null;

  const dmQueueStart = () => {
    const queue = leads.filter(l => l.status === 'new' && l.linkedin);
    if (!queue.length) { toast.error('No new leads with a LinkedIn profile.'); return; }
    setDmQueue(queue);
    // Pre-copy the first note so the very first profile is paste-ready.
    void navigator.clipboard?.writeText(fillTemplate(LINKEDIN_TEMPLATE, queue[0])).catch(() => {});
  };

  const dmQueueAdvance = () => {
    setDmQueue(prev => {
      const rest = prev && prev.length > 1 ? prev.slice(1) : null;
      if (rest) void navigator.clipboard?.writeText(fillTemplate(LINKEDIN_TEMPLATE, rest[0])).catch(() => {});
      else toast.success('DM queue finished 🎉');
      return rest;
    });
  };

  const dmQueueMarkSent = async () => {
    if (!dmQueueCurrent) return;
    const id = dmQueueCurrent.id;
    try {
      await auth.makeAuthenticatedRequest(`/api/admin/lo-leads/${id}/dm-sent`, { method: 'POST' });
      setLeads(prev => prev.filter(l => l.id !== id));
      dmQueueAdvance();
    } catch {
      toast.error('Could not mark as sent — try again');
    }
  };

  const dmQueueSkip = async () => {
    if (!dmQueueCurrent) return;
    const id = dmQueueCurrent.id;
    try {
      await auth.makeAuthenticatedRequest(`/api/admin/lo-leads/${id}/skip`, { method: 'POST' });
      setLeads(prev => prev.filter(l => l.id !== id));
    } catch { /* advance anyway — worst case the lead stays in New */ }
    dmQueueAdvance();
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
      const d = await res.json() as { success?: boolean; queued?: number };
      if (!res.ok || !d.success) { setMsg('❌ Bulk send failed.'); return; }
      setMsg(`📨 Sending ${d.queued ?? 0} acquisition links in the background… the New list will shrink as they go. (Big batches take a minute.)`);
      // Refresh a few times so the list updates as sends complete.
      const tab = statusFilter;
      let polls = 0;
      const iv = setInterval(() => {
        polls += 1;
        void load(tab);
        if (polls >= 6) clearInterval(iv);
      }, 7000);
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
          Find loan officers on LinkedIn with one tap, or import an Apify run / CSV.
          Review the pool, then work leads by DM, text, or email.
        </p>

        <div className="mt-5">
          <button
            onClick={findOnLinkedIn}
            disabled={finding || importing}
            className="w-full rounded-xl bg-sky-600 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-sky-700 disabled:opacity-50 sm:w-auto"
          >
            {finding ? '🔎 Searching LinkedIn…' : '🔎 Find 50 US Loan Officers on LinkedIn'}
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
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
          <label className={`rounded-xl border border-slate-300 px-6 py-3 text-center text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 ${importing ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}>
            📄 Import CSV
            <input type="file" accept=".csv,text/csv" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) void importCsv(f); e.target.value = ''; }} />
          </label>
        </div>
        <p className="mt-2 text-xs text-slate-400">CSV columns auto-detected (email, name, company, phone, LinkedIn, city/state). Rows need an email or a LinkedIn URL; dupes are skipped.</p>
        {msg && <p className="mt-3 text-sm font-semibold text-slate-700">{msg}</p>}
      </div>

      {/* Pool table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPoolOpen(o => !o)}
              aria-label={poolOpen ? 'Collapse list' : 'Expand list'}
              className="flex items-center gap-1.5 text-sm font-bold text-slate-700 hover:text-slate-900"
            >
              <span className={`inline-block transition-transform ${poolOpen ? 'rotate-90' : ''}`}>▶</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{leads.length}</span>
            </button>
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
          </div>
          {isNew && leads.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={dmQueueStart}
                className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-sky-700"
              >
                🔗 DM Queue ({leads.filter(l => l.linkedin).length})
              </button>
              <button
                onClick={sendBulk}
                disabled={bulkSending}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 disabled:opacity-50"
              >
                {bulkSending ? 'Sending…' : selected.size > 0 ? `🚀 Send to ${selected.size} selected` : '🚀 Send to all new'}
              </button>
            </div>
          )}
        </div>

        {!poolOpen ? null : loading ? (
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
                    <td className="px-4 py-3 text-slate-600">{l.email || <span className="text-slate-300">— DM only</span>}</td>
                    <td className="px-4 py-3">
                      <p className="text-slate-600">{l.employer || '—'}</p>
                      <p className="text-xs text-slate-400">{l.city || ''}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{l.phone || '—'}</td>
                    <td className="px-4 py-3 text-xs">
                      {l.linkedin && <a href={absUrl(l.linkedin) || undefined} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline">LinkedIn</a>}
                      {l.linkedin && l.source_url && <span className="text-slate-300"> · </span>}
                      {l.source_url && <a href={absUrl(l.source_url) || undefined} target="_blank" rel="noreferrer" className="text-slate-500 hover:underline">Site</a>}
                    </td>
                    {isNew ? (
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <button onClick={() => textLead(l)} disabled={!l.phone} title={l.phone ? 'Open Messages with a ready-to-send text' : 'No phone number'} className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-40">💬 Text</button>
                          <button onClick={() => dmLead(l)} disabled={!l.linkedin} title={l.linkedin ? 'Copy the DM + open their LinkedIn' : 'No LinkedIn'} className="rounded-lg bg-sky-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-sky-700 disabled:opacity-40">🔗 DM</button>
                          <button onClick={() => sendOne(l.id)} disabled={rowBusy === l.id || !l.email} title={l.email ? 'Email the acquisition link (use sparingly — cold email risks spam)' : 'No email — use 🔗 DM'} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-40">Email</button>
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

      {/* DM Queue overlay — one lead at a time, ~10 seconds each */}
      {dmQueueCurrent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-sky-600">🔗 DM Queue · {dmQueue?.length} left</p>
              <button onClick={() => setDmQueue(null)} aria-label="Close DM queue" className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <h3 className="mt-3 text-lg font-bold text-slate-900">{dmQueueCurrent.name || 'Unknown name'}</h3>
            <p className="text-sm text-slate-500">
              {[dmQueueCurrent.job_title, dmQueueCurrent.employer].filter(Boolean).join(' · ') || 'Loan officer'}
              {dmQueueCurrent.city ? ` — ${dmQueueCurrent.city}` : ''}
            </p>

            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
              {fillTemplate(LINKEDIN_TEMPLATE, dmQueueCurrent)}
            </div>
            <p className="mt-2 text-xs text-slate-400">This note is already on your clipboard. On LinkedIn: Connect → Add a note → paste → Send.</p>

            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={() => dmLead(dmQueueCurrent)}
                className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-sky-700"
              >
                📋 Copy note + Open their LinkedIn
              </button>
              <div className="flex gap-2">
                <button
                  onClick={dmQueueMarkSent}
                  className="flex-1 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700"
                >
                  ✅ Sent — next
                </button>
                <button
                  onClick={dmQueueSkip}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-100"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLoLeadFinderPanel;
