import React from 'react';

// The shared look for loan-officer pages. The anchor is the Marketing and AI Brain pages:
// big black title, one plain sentence under it, white rounded cards, tinted icon tiles,
// blue buttons, small blue tags, and "next step" rows. Use these instead of one-off styles.

export const loCard = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';
export const loCardTint = 'rounded-2xl border border-primary-200 bg-primary-50 p-5 shadow-sm';
export const loSolid = 'inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-primary-600 px-4 text-sm font-extrabold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60';
export const loGhost = 'inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 transition hover:border-primary-500 hover:text-primary-700 disabled:opacity-60';
export const loInput = 'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-500 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-200';

export const LoIcon: React.FC<{ name: string; className?: string }> = ({ name, className = '' }) => (
  <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>{name}</span>
);

/** Big title with one plain sentence under it, and an optional action on the right. */
export const LoPageHeader: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode }> = ({ title, subtitle, action }) => (
  <div className="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
    </div>
    {action}
  </div>
);

/** The tinted square that holds an icon. */
export const LoIconTile: React.FC<{ name: string; tone?: 'blue' | 'green' | 'amber' | 'slate' }> = ({ name, tone = 'blue' }) => {
  const t = { blue: 'bg-primary-50 text-primary-700', green: 'bg-green-50 text-green-700', amber: 'bg-amber-50 text-amber-700', slate: 'bg-slate-100 text-slate-700' }[tone];
  return <span aria-hidden="true" className={`material-symbols-outlined flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ${t}`}>{name}</span>;
};

/** Small rounded label: "Knowledge", "New", "Live". */
export const LoTag: React.FC<{ children: React.ReactNode; tone?: 'blue' | 'green' | 'amber' | 'red' | 'slate' }> = ({ children, tone = 'blue' }) => {
  const t = { blue: 'bg-primary-50 text-primary-800', green: 'bg-green-100 text-green-800', amber: 'bg-amber-100 text-amber-900', red: 'bg-red-100 text-red-800', slate: 'bg-slate-100 text-slate-700' }[tone];
  return <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold ${t}`}>{children}</span>;
};

/** A section card with an icon tile, a title, a sentence, and room for buttons underneath. */
export const loFoldSummary = "flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 text-lg font-extrabold text-slate-900 after:text-slate-500 after:content-['▾'] group-open:after:rotate-180 [&::-webkit-details-marker]:hidden";

export const LoSectionCard: React.FC<{ icon: string; title: string; description?: string; children?: React.ReactNode; tone?: 'blue' | 'green' | 'amber' | 'slate'; fold?: boolean }> = ({ icon, title, description, children, tone, fold }) => fold ? (
  <details className={`${loCard} group`} aria-label={title}>
    <summary className={loFoldSummary}>
      <span className="flex items-start gap-3">
        <LoIconTile name={icon} tone={tone} />
        <span className="min-w-0"><span className="block text-lg font-extrabold text-slate-900">{title}</span>{description && <span className="block text-sm font-normal text-slate-600">{description}</span>}</span>
      </span>
    </summary>
    {children && <div className="mt-4">{children}</div>}
  </details>
) : (
  <section className={loCard} aria-label={title}>
    <div className="flex items-start gap-3">
      <LoIconTile name={icon} tone={tone} />
      <div className="min-w-0">
        <h2 className="text-lg font-extrabold text-slate-900">{title}</h2>
        {description && <p className="text-sm text-slate-600">{description}</p>}
      </div>
    </div>
    {children && <div className="mt-4">{children}</div>}
  </section>
);

/** One status row: check, icon tile, title and sentence, tag, next step. */
export const LoRow: React.FC<{ icon: string; title: string; description?: string; ok?: boolean; tag?: string; next?: string; onClick?: () => void; children?: React.ReactNode }> = ({ icon, title, description, ok, tag, next, onClick, children }) => {
  const body = (
    <>
      {ok !== undefined && <LoIcon name={ok ? 'check_circle' : 'radio_button_unchecked'} className={`text-2xl ${ok ? 'text-green-700' : 'text-amber-700'}`} />}
      <span aria-hidden="true" className="material-symbols-outlined flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">{icon}</span>
      <div className="min-w-0 flex-1 basis-48 text-left"><p className="text-sm font-extrabold text-slate-900">{title}</p>{description && <p className="text-xs text-slate-600">{description}</p>}</div>
      {tag && <LoTag>{tag}</LoTag>}
      {next && <span className="text-xs font-semibold text-slate-700">Next step: {next}</span>}
      {children}
      {onClick && <LoIcon name="arrow_forward" className="text-slate-500" />}
    </>
  );
  const cls = 'flex w-full flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5';
  return onClick
    ? <button type="button" onClick={onClick} className={`${cls} transition hover:border-primary-400`}>{body}</button>
    : <div className={cls}>{body}</div>;
};

/** A number with a label, for the top of a page. */
export const LoStat: React.FC<{ value: React.ReactNode; label: string; note?: string }> = ({ value, label, note }) => (
  <div className={loCard}>
    <p className="text-3xl font-black tracking-tight text-slate-900">{value}</p>
    <p className="text-sm font-semibold text-slate-700">{label}</p>
    {note && <p className="text-xs text-slate-600">{note}</p>}
  </div>
);
