import React from 'react';
import { ChevronDown } from 'lucide-react';

type Props = {
  title: React.ReactNode;
  hint?: React.ReactNode;
  defaultOpen?: boolean;
  nested?: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
};

// One card that opens and closes. The marker lets "Expand all / Collapse all" find every card in a section.
export default function Collapsible({ title, hint, defaultOpen = true, nested = false, badge, children }: Props) {
  const shell = nested ? 'rounded-xl border border-slate-200 bg-white' : 'rounded-2xl border border-slate-200 bg-white shadow-sm';
  return (
    <details data-collapsible open={defaultOpen} className={`group min-w-0 ${shell}`}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block font-bold text-slate-900">{title}</span>
          {hint && <span className="mt-0.5 block text-sm font-normal text-slate-500">{hint}</span>}
        </span>
        {badge && <span className="ml-auto shrink-0">{badge}</span>}
        <ChevronDown size={18} aria-hidden="true" className="shrink-0 text-slate-500 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-slate-100 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">{children}</div>
    </details>
  );
}
