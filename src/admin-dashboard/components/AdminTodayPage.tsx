import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthService } from '../../services/authService';

export type TodayData = {
  wentOut: { available: boolean; postCount: number; emailsSent: number | null; posts: Array<{ channel: string; title: string; postedAt: string; url: string | null }> };
  needsMe: { available: boolean; items: Array<{ kind: string; text: string; count: number; to: string }> };
  worked: { available: boolean; verdicts: string[]; gaps: string[]; signups: number | null; leads: number | null };
  notes: string[];
};

const NOT_AVAILABLE = 'Not available right now.';

const Box: React.FC<{ title: string; hint: string; children: React.ReactNode }> = ({ title, hint, children }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
    <div>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="text-sm text-slate-600">{hint}</p>
    </div>
    {children}
  </section>
);

const whenText = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' });
};

export const TodayView: React.FC<{ data: TodayData | null; error?: boolean; onGo?: (to: string) => void }> = ({ data, error, onGo }) => {
  if (error || !data) return <p className="text-sm text-slate-700">{NOT_AVAILABLE}</p>;
  const { wentOut, needsMe, worked } = data;
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Box title="What went out" hint="Last 7 days">
        {!wentOut.available ? <p className="text-sm text-slate-700">{NOT_AVAILABLE}</p> : (
          <>
            <p className="text-sm text-slate-800">
              {wentOut.postCount} post{wentOut.postCount === 1 ? '' : 's'}
              {wentOut.emailsSent === null ? ' · cold email: not available' : ` · ${wentOut.emailsSent} cold email${wentOut.emailsSent === 1 ? '' : 's'}`}
            </p>
            {wentOut.posts.length === 0 ? <p className="text-sm text-slate-700">Nothing has gone out yet.</p> : (
              <ul className="space-y-2">
                {wentOut.posts.map((p, i) => (
                  <li key={`${p.channel}-${p.postedAt}-${i}`} className="text-sm text-slate-800">
                    <span className="font-semibold">{p.channel}</span> · {p.title}
                    <span className="block text-xs text-slate-600">{whenText(p.postedAt)}{p.url && <> · <a className="underline" href={p.url} target="_blank" rel="noreferrer">open</a></>}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Box>
      <Box title="What needs you" hint="Nothing posts until you approve it">
        {!needsMe.available ? <p className="text-sm text-slate-700">{NOT_AVAILABLE}</p> : needsMe.items.length === 0 ? (
          <p className="text-sm text-slate-800">Nothing is waiting for you.</p>
        ) : (
          <ul className="space-y-2">
            {needsMe.items.map((item) => (
              <li key={item.kind}>
                <button type="button" onClick={() => onGo?.(item.to)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm font-semibold text-slate-900 hover:bg-slate-50">{item.text}</button>
              </li>
            ))}
          </ul>
        )}
      </Box>
      <Box title="What worked" hint="Only what we can really count">
        {!worked.available ? <p className="text-sm text-slate-700">{NOT_AVAILABLE}</p> : (
          <>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-800">{worked.verdicts.map((v) => <li key={v}>{v}</li>)}</ul>
            {worked.gaps.map((g) => <p key={g} className="text-xs text-slate-600">{g}</p>)}
          </>
        )}
      </Box>
    </div>
  );
};

const AdminTodayPage: React.FC<{ onGo?: (to: string) => void }> = ({ onGo }) => {
  const auth = useMemo(() => AuthService.getInstance(), []);
  const [data, setData] = useState<TodayData | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await auth.makeAuthenticatedRequest('/api/admin/today');
      if (!res?.ok) throw new Error('bad');
      setData(await res.json());
      setError(false);
    } catch { setError(true); } finally { setLoading(false); }
  }, [auth]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Today</h1>
        <button type="button" onClick={() => void load()} disabled={loading} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">{loading ? 'Refreshing…' : 'Refresh'}</button>
      </div>
      {loading && !data ? <p className="text-sm text-slate-700">Loading…</p> : <TodayView data={data} error={error} onGo={onGo} />}
      {data?.notes?.length ? <p className="text-xs text-slate-600">{data.notes.join(' ')}</p> : null}
    </div>
  );
};

export default AdminTodayPage;
