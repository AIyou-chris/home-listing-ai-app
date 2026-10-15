import React, { useCallback, useEffect, useState } from 'react';
import { buildApiUrl } from '../../lib/api';
import { authedFetch } from '../../services/authedFetch';

// One quick page: what is working in our marketing, in plain words, with the numbers underneath.

type Count = { source: string; count: number };
type Analytics = {
  days: number;
  verdicts: string[];
  notes: string[];
  gaps: string[];
  posts: { total: number; published: number; failed: number; byChannel: { channel: string; published: number; failed: number; scheduled: number }[] };
  signups: { total: number; tagged: number; bySource: Count[]; byCampaign: { campaign: string; source: string; title: string; count: number }[] };
  leads: { total: number; bySource: Count[] };
  blog: { views: number; ctaClicks: number; leads: number; trials: number; top: { slug: string; views: number; ctaClicks: number; leads: number; trials: number }[] };
  cold: { sent: number; replies: number; positive: number; bounced: number; replyRate: number; bounceRate: number; complaintRate: number; byAngle: { angle: string; sent: number; replies: number; replyRate: number }[] };
};

const LABEL: Record<string, string> = { facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn', youtube: 'YouTube' };
const card = 'rounded-xl border border-slate-200 bg-white p-4';

const Tile = ({ label, value, hint }: { label: string; value: string | number; hint?: string }) => (
  <div className={card}><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>{hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}</div>
);

const Table = ({ head, rows, empty }: { head: string[]; rows: (string | number)[][]; empty: string }) => rows.length === 0
  ? <p className="text-sm text-slate-500">{empty}</p>
  : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase text-slate-500">{head.map((h) => <th key={h} className="py-2 pr-4 font-semibold">{h}</th>)}</tr></thead>
    <tbody>{rows.map((row, i) => <tr key={i} className="border-b border-slate-100">{row.map((cell, j) => <td key={j} className="py-2 pr-4 text-slate-800">{cell}</td>)}</tr>)}</tbody></table></div>;

export default function MarketingAnalyticsPanel() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await authedFetch(buildApiUrl(`/api/admin/marketing-analytics?days=${days}`));
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not load the analytics.');
      setData(body as Analytics);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load the analytics.'); }
    finally { setLoading(false); }
  }, [days]);
  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="text-lg font-bold text-slate-900">What is working</h3><p className="text-sm text-slate-500">A quick look at posts, signups, the blog and cold email.</p></div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-slate-700" htmlFor="analytics-days">Show</label>
          <select id="analytics-days" value={days} onChange={(e) => setDays(Number(e.target.value))} className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm">
            <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
          </select>
          <button type="button" onClick={() => void load()} className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Refresh</button>
        </div>
      </div>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading && !data && <p className="text-sm text-slate-500">Loading…</p>}

      {data && <>
        <div className={`${card} border-indigo-200 bg-indigo-50`}>
          <p className="text-sm font-bold text-indigo-900">The short answer</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-indigo-900">{data.verdicts.map((v) => <li key={v}>{v}</li>)}</ul>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Tile label="Posts sent" value={data.posts.published} hint={data.posts.failed ? `${data.posts.failed} failed` : 'none failed'} />
          <Tile label="Signups" value={data.signups.total} hint={`${data.signups.tagged} with a source`} />
          <Tile label="Leads" value={data.leads.total} />
          <Tile label="Blog views" value={data.blog.views} hint={`${data.blog.ctaClicks} button clicks`} />
        </div>

        <div className={card}><h4 className="mb-2 font-bold text-slate-900">Posts by platform</h4>
          <Table head={['Platform', 'Posted', 'Failed', 'Waiting']} empty="No posts yet."
            rows={data.posts.byChannel.map((c) => [LABEL[c.channel] || c.channel, c.published, c.failed, c.scheduled])} /></div>

        <div className={card}><h4 className="mb-2 font-bold text-slate-900">Where signups came from</h4>
          <Table head={['Source', 'Signups']} empty="No signup has a source tag yet. Signups from a tagged post link will show up here."
            rows={data.signups.bySource.map((s) => [LABEL[s.source] || s.source, s.count])} />
          {data.signups.byCampaign.length > 0 && <div className="mt-4"><h5 className="mb-2 text-sm font-semibold text-slate-700">Posts that brought signups</h5>
            <Table head={['Post', 'Platform', 'Signups']} empty="" rows={data.signups.byCampaign.map((c) => [c.title || c.campaign, LABEL[c.source] || c.source, c.count])} /></div>}</div>

        <div className={card}><h4 className="mb-2 font-bold text-slate-900">Where leads came from</h4>
          <Table head={['Source', 'Leads']} empty="No leads in this period." rows={data.leads.bySource.map((s) => [s.source, s.count])} /></div>

        <div className={card}><h4 className="mb-2 font-bold text-slate-900">Blog articles</h4>
          <Table head={['Article', 'Views', 'Button clicks', 'Leads', 'Trials']} empty="No article views yet."
            rows={data.blog.top.map((a) => [a.slug, a.views, a.ctaClicks, a.leads, a.trials])} /></div>

        <div className={card}><h4 className="mb-2 font-bold text-slate-900">Cold email</h4>
          {data.cold.sent === 0 ? <p className="text-sm text-slate-500">Nothing sent yet.</p> : <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Tile label="Sent" value={data.cold.sent} /><Tile label="Replied" value={`${data.cold.replyRate}%`} hint={`${data.cold.replies} people`} />
              <Tile label="Bounced" value={`${data.cold.bounceRate}%`} /><Tile label="Spam complaints" value={`${data.cold.complaintRate}%`} />
            </div>
            {data.cold.byAngle.length > 0 && <div className="mt-4"><Table head={['Message angle', 'Sent', 'Replies', 'Reply rate']} empty="" rows={data.cold.byAngle.map((a) => [a.angle, a.sent, a.replies, `${a.replyRate}%`])} /></div>}
          </>}</div>

        {[...data.notes, ...data.gaps].map((n) => <p key={n} className="text-xs text-slate-500">{n}</p>)}
      </>}
    </div>
  );
}
