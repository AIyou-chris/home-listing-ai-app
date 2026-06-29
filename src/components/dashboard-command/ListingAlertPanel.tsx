// src/components/dashboard-command/ListingAlertPanel.tsx
import React, { useEffect, useState } from 'react';
import {
  getPendingAlerts, getSubscriberCount, sendAlert, dismissAlert, sendManualBlast, PendingAlert,
} from '../../services/listingAlerts';

interface Props { listingId: string; agentId: string | null; }

const ListingAlertPanel: React.FC<Props> = ({ listingId, agentId }) => {
  const [count, setCount] = useState(0);
  const [pending, setPending] = useState<PendingAlert[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const refresh = async () => {
    setCount(await getSubscriberCount(agentId, listingId));
    const all = await getPendingAlerts(agentId);
    setPending(all.filter((p) => p.listing_id === listingId));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void refresh(); }, [listingId, agentId]);

  const approve = async (id: string) => {
    setBusy(true);
    try { await sendAlert(agentId, id); setNote('Alert sent ✓'); await refresh(); }
    finally { setBusy(false); }
  };
  const dismiss = async (id: string) => { setBusy(true); try { await dismissAlert(agentId, id); await refresh(); } finally { setBusy(false); } };
  const blast = async () => {
    if (!message.trim()) return;
    setBusy(true);
    try { const r = await sendManualBlast(agentId, listingId, message.trim()); setNote(`Sending to ${r.queued} subscribers…`); setMessage(''); await refresh(); }
    finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">🔔 Price-Drop Alerts</h3>
        <span className="text-xs text-slate-400">{count} watching this home</span>
      </div>

      {pending.map((p) => (
        <div key={p.id} className="mt-3 rounded-xl bg-slate-800/70 p-3">
          <p className="text-xs text-slate-300">{p.payload.message || 'Pending alert'}</p>
          <p className="mt-1 text-[11px] text-slate-500">{p.recipient_count} people will get this text.</p>
          <div className="mt-2 flex gap-2">
            <button disabled={busy} onClick={() => approve(p.id)} className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">Send alert</button>
            <button disabled={busy} onClick={() => dismiss(p.id)} className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs text-slate-200 disabled:opacity-60">Dismiss</button>
          </div>
        </div>
      ))}

      <div className="mt-4 border-t border-slate-700 pt-3">
        <div className="mb-2 flex gap-2">
          <button onClick={() => setMessage('Open house this weekend! Come see this home in person.')} className="rounded-lg bg-slate-700 px-2 py-1 text-[11px] text-slate-200">🏠 Open house template</button>
        </div>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2}
          placeholder="Send a custom text to everyone watching…"
          className="w-full rounded-xl bg-slate-800 px-3 py-2 text-xs text-slate-100 placeholder-slate-500" />
        <button disabled={busy || !message.trim()} onClick={blast}
          className="mt-2 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
          Send to {count} subscribers
        </button>
      </div>

      {note && <p className="mt-2 text-xs text-emerald-400">{note}</p>}
    </div>
  );
};

export default ListingAlertPanel;
