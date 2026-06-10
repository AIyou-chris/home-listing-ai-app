import React, { useState } from 'react';

// Shared buyer-facing mortgage calculator — used by the WOW link (PartnerInvitePage)
// and the public listing share app (PublicPropertyApp).
const MortgageCalculator: React.FC<{
  price: number;
  brandColor: string;
  onGetPreApproved: () => void;
  ctaLabel?: string;
  showCta?: boolean;
  /** Opt-in: follow the visitor's system dark mode. Off for the WOW page, which is always light. */
  autoDark?: boolean;
}> = ({ price, brandColor, onGetPreApproved, ctaLabel = 'Get Pre-Approved in 60 Seconds', showCta = true, autoDark = false }) => {
  const d = (light: string, dark: string) => (autoDark ? `${light} ${dark}` : light);
  const [isOpen, setIsOpen] = useState(false);
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(7.1);
  const [term, setTerm] = useState(30);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const downAmount = Math.round(price * (downPct / 100));
  const loanAmount = price - downAmount;
  const monthlyRate = rate / 100 / 12;
  const numPayments = term * 12;
  const pi = monthlyRate === 0
    ? loanAmount / numPayments
    : (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
  const taxes = Math.round((price * 0.012) / 12);
  const insurance = 150;
  const total = Math.round(pi + taxes + insurance);

  return (
    <div className={d('m-3.5 overflow-hidden rounded-[20px] bg-white shadow-[0_4px_20px_rgba(15,23,42,0.08)]', 'dark:bg-[#0f172a]')}>
      {/* Header — tap to expand/collapse */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className={d('flex w-full items-center justify-between px-5 pt-5 pb-4 active:bg-slate-50 transition-colors', 'dark:active:bg-slate-800')}
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <div className="text-left">
          <p className="text-[11px] font-extrabold uppercase tracking-widest" style={{ color: brandColor }}>Monthly Payment</p>
          <div className="mt-1 flex items-end gap-2">
            <span className={d('text-[36px] font-black leading-none text-slate-900', 'dark:text-slate-100')}>${total.toLocaleString()}</span>
            <span className="mb-1 text-sm font-semibold text-slate-400">/mo</span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">{downPct}% down · {term}yr fixed · {rate.toFixed(1)}% rate</p>
        </div>
        <span
          className="material-symbols-outlined ml-3 flex-shrink-0 text-[22px] text-slate-400 transition-transform duration-300"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >expand_more</span>
      </button>

      {/* Collapsible body */}
      {isOpen && <>

      {/* Term picker */}
      <div className="flex gap-2 px-5 pb-3">
        {[15, 20, 30].map(t => (
          <button
            key={t}
            onClick={() => setTerm(t)}
            className={`flex-1 rounded-xl py-2 text-[13px] font-extrabold transition-all ${term === t ? 'text-white shadow-sm' : d('bg-slate-100 text-slate-500', 'dark:bg-slate-800 dark:text-slate-400')}`}
            style={term === t ? { background: brandColor } : {}}
          >
            {t}yr
          </button>
        ))}
      </div>

      {/* Down payment slider */}
      <div className="px-5 pb-3">
        <div className="flex justify-between mb-1.5">
          <span className={d('text-[12px] font-bold text-slate-600', 'dark:text-slate-300')}>Down Payment</span>
          <span className="text-[12px] font-extrabold" style={{ color: brandColor }}>{downPct}% · ${downAmount.toLocaleString()}</span>
        </div>
        <input
          type="range"
          min={3}
          max={50}
          step={1}
          value={downPct}
          onChange={e => setDownPct(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{ accentColor: brandColor }}
        />
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-slate-400">3%</span>
          <span className="text-[10px] text-slate-400">50%</span>
        </div>
      </div>

      {/* Rate input */}
      <div className="px-5 pb-4">
        <div className="flex justify-between mb-1.5">
          <span className={d('text-[12px] font-bold text-slate-600', 'dark:text-slate-300')}>Interest Rate</span>
          <span className="text-[12px] font-extrabold" style={{ color: brandColor }}>{rate.toFixed(1)}%</span>
        </div>
        <input
          type="range"
          min={4.0}
          max={10.0}
          step={0.1}
          value={rate}
          onChange={e => setRate(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{ accentColor: brandColor }}
        />
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-slate-400">4%</span>
          <span className="text-[10px] text-slate-400">10%</span>
        </div>
      </div>

      {/* Breakdown toggle */}
      <button
        onClick={() => setShowBreakdown(s => !s)}
        className={d('flex w-full items-center justify-between border-t border-slate-100 px-5 py-3 text-[12px] font-bold text-slate-500', 'dark:border-slate-800')}
      >
        <span>See full breakdown</span>
        <span className="material-symbols-outlined text-[16px] transition-transform" style={{ transform: showBreakdown ? 'rotate(180deg)' : 'none' }}>expand_more</span>
      </button>

      {showBreakdown && (
        <div className={d('px-5 pb-4 space-y-2 border-t border-slate-100 pt-3', 'dark:border-slate-800')}>
          {[
            { label: 'Principal & Interest', value: `$${Math.round(pi).toLocaleString()}` },
            { label: 'Property Taxes (est.)', value: `$${taxes.toLocaleString()}` },
            { label: 'Homeowners Insurance (est.)', value: `$${insurance}` },
          ].map(row => (
            <div key={row.label} className="flex justify-between">
              <span className="text-[12px] text-slate-500">{row.label}</span>
              <span className={d('text-[12px] font-bold text-slate-800', 'dark:text-slate-200')}>{row.value}</span>
            </div>
          ))}
          <div className={d('flex justify-between border-t border-slate-200 pt-2 mt-2', 'dark:border-slate-700')}>
            <span className={d('text-[13px] font-extrabold text-slate-900', 'dark:text-slate-100')}>Total / month</span>
            <span className="text-[13px] font-extrabold" style={{ color: brandColor }}>${total.toLocaleString()}</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">Estimates only. Does not include HOA, PMI, or utilities. Contact your lender for exact figures.</p>
        </div>
      )}

      {/* Pre-approval CTA */}
      {showCta && (
        <div className="px-5 pb-5 pt-1">
          <button
            onClick={onGetPreApproved}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-extrabold text-white shadow-[0_6px_20px_rgba(0,0,0,0.15)] transition-transform active:scale-[0.99]"
            style={{ background: `linear-gradient(135deg,#059669,#10b981)` }}
          >
            <span className="text-xl">✅</span>
            {ctaLabel}
          </button>
          <p className="mt-2 text-center text-[11px] text-slate-400">Talk to the AI — no forms, no hard pull</p>
        </div>
      )}

      </>}
    </div>
  );
};

export default MortgageCalculator;
