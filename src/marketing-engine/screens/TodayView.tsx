import React from 'react';
import Collapsible from './Collapsible';

export type TodayData = {
  wentOut: { available: boolean; postCount: number; emailsSent: number | null; posts: Array<{ channel: string; title: string; postedAt: string; url: string | null }> };
  needsMe: { available: boolean; items: Array<{ kind: string; text: string; count: number; to: string }> };
  worked: { available: boolean; verdicts: string[]; gaps: string[]; signups: number | null; leads: number | null };
  notes: string[];
};

const NOT_AVAILABLE = 'Not available right now.';

const Box: React.FC<{ title: string; hint: string; children: React.ReactNode }> = ({ title, hint, children }) => (
  <Collapsible title={title} hint={hint}><div className="space-y-3">{children}</div></Collapsible>
);

const whenText = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' });
};

export const TodayView: React.FC<{ data: TodayData | null; error?: boolean; onGo?: (to: string) => void }> = ({ data, error, onGo }) => {
  if (error || !data) return <p className="text-sm text-slate-700">{NOT_AVAILABLE}</p>;
  const { wentOut, needsMe, worked } = data;
  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
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
