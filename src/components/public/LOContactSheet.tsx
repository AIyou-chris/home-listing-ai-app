import React, { useEffect, useRef, useState } from 'react';
import { buildApiUrl } from '../../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LOInfo {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  headshotUrl: string | null;
  nmlsNumber: string | null;
  company: string | null;
}

interface AgentInfo {
  name: string;
  headshotUrl: string;
  phone: string;
  email: string;
}

type SheetMode = 'question' | 'showing' | 'preapproval' | 'success';

// When / how times the pill label options
const WHEN_OPTIONS = ['This week', 'Next week', 'Flexible'] as const;
const TIME_OPTIONS = ['Morning', 'Afternoon', 'Evening'] as const;

// Pre-qual question options
const TIMELINE_OPTIONS = ['ASAP', '1–3 months', '3–6 months', 'Just looking'] as const;
const CREDIT_OPTIONS = ['Excellent (740+)', 'Good (680–739)', 'Fair (580–679)', 'Unsure'] as const;
const INCOME_OPTIONS = ['Under $50k', '$50k–$100k', '$100k–$150k', '$150k+'] as const;
const DOWN_OPTIONS = ['Under 5%', '5–10%', '10–20%', '20%+'] as const;
const PROPERTY_OPTIONS = ['Primary Home', 'Investment', 'Vacation'] as const;

const SESSION_KEY = 'hlai_lo_sheet_dismissed';
const TIMER_MS = 20_000;
const SCROLL_THRESHOLD = 0.6;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Avatar({
  src,
  name,
  size = 28,
}: {
  src?: string | null;
  name: string;
  size?: number;
}) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const style = { width: size, height: size, borderRadius: '50%', flexShrink: 0 } as React.CSSProperties;

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={style}
        className="object-cover border-2 border-white/10"
      />
    );
  }
  return (
    <div
      style={{ ...style, background: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      className="text-sky-300 font-bold text-xs"
    >
      {initials}
    </div>
  );
}

function PillRow({
  options,
  selected,
  onSelect,
  color = 'blue',
}: {
  options: readonly string[];
  selected: string;
  onSelect: (v: string) => void;
  color?: 'blue' | 'green';
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isSelected = selected === opt;
        const selectedCls =
          color === 'green'
            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
            : 'bg-blue-600/20 border-blue-500/40 text-sky-300';
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onSelect(opt)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              isSelected
                ? selectedCls
                : 'bg-white/4 border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-400'
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function FieldDisplay({ value }: { value: string }) {
  return (
    <div className="bg-white/6 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-300">
      {value || <span className="text-slate-600">—</span>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  listingId: string;
  agent: AgentInfo;
}

const LOContactSheet: React.FC<Props> = ({ listingId, agent }) => {
  // LO data
  const [lo, setLo] = useState<LOInfo | null>(null);

  // Sheet visibility
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // UI mode
  const [mode, setMode] = useState<SheetMode>('question');

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [when, setWhen] = useState<string>('');
  const [time, setTime] = useState<string>('');
  // Pre-qual fields
  const [purchaseTimeline, setPurchaseTimeline] = useState('');
  const [creditRange, setCreditRange] = useState('');
  const [incomeRange, setIncomeRange] = useState('');
  const [downPayment, setDownPayment] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggeredRef = useRef(false);

  // ── Fetch LO ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!listingId) return;
    fetch(buildApiUrl(`/api/public/listing/${encodeURIComponent(listingId)}/lo`))
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && data.lo) setLo(data.lo);
      })
      .catch(() => {
        // silently ignore — sheet still shows (agent-only mode)
      });
  }, [listingId]);

  // ── Trigger logic ──────────────────────────────────────────────────────────
  const trigger = () => {
    if (triggeredRef.current) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    triggeredRef.current = true;
    setVisible(true);
  };

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;

    // 20-second timer
    timerRef.current = setTimeout(trigger, TIMER_MS);

    // 60% scroll depth
    const onScroll = () => {
      const scrolled = window.scrollY + window.innerHeight;
      const total = document.documentElement.scrollHeight;
      if (total > 0 && scrolled / total >= SCROLL_THRESHOLD) {
        trigger();
        window.removeEventListener('scroll', onScroll);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener('scroll', onScroll);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Dismiss ────────────────────────────────────────────────────────────────
  const dismiss = () => {
    sessionStorage.setItem(SESSION_KEY, '1');
    setDismissed(true);
    setVisible(false);
  };

  // ── Submit: showing request ────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) {
      setFormError('Name and email are required.');
      return;
    }
    setFormError('');
    setSubmitting(true);

    try {
      const resp = await fetch(buildApiUrl('/api/leads/capture'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listingId,
          full_name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          consent_sms: !!phone.trim(),
          source_type: 'listing_page',
          context: 'showing_request',
          source_meta: { when, preferred_time: time },
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || 'Submission failed');
      }

      setMode('success');
      setTimeout(dismiss, 3000);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Submit: pre-qual ───────────────────────────────────────────────────────
  const handlePreQualSubmit = async () => {
    if (!name.trim() || !email.trim()) {
      setFormError('Name and email are required.');
      return;
    }
    setFormError('');
    setSubmitting(true);

    try {
      const resp = await fetch(buildApiUrl('/api/leads/pre-qual'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listingId,
          full_name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          consent_sms: !!phone.trim(),
          purchase_timeline: purchaseTimeline || null,
          credit_range: creditRange || null,
          income_range: incomeRange || null,
          down_payment: downPayment || null,
          property_type: propertyType || null,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || 'Submission failed');
      }

      setMode('success');
      setTimeout(dismiss, 3000);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible || dismissed) return null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[998] bg-black/40 backdrop-blur-[2px]"
        onClick={dismiss}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[999] animate-slide-up"
        style={{ maxWidth: '480px', margin: '0 auto' }}
      >
        <div
          className="bg-gradient-to-b from-[#1e1b4b] via-[#0f172a] to-[#0c1a2e] border border-white/8 border-b-0 rounded-t-3xl px-5 pb-8 pt-3"
          style={{ boxShadow: '0 -16px 48px rgba(0,0,0,0.65)' }}
        >
          {/* Drag handle */}
          <div className="w-9 h-1 bg-white/15 rounded-full mx-auto mb-4" />

          {/* SUCCESS state */}
          {mode === 'success' && (
            <div className="text-center py-6">
              <div className="text-4xl mb-3">🎉</div>
              <div className="text-white font-bold text-lg mb-1">You're all set!</div>
              <div className="text-slate-400 text-sm">
                {mode === 'success'
                  ? "We'll be in touch soon."
                  : "We'll be in touch soon."}
              </div>
            </div>
          )}

          {/* QUESTION state */}
          {mode === 'question' && (
            <>
              {/* Agent + LO mini strip */}
              <div className="flex items-center gap-3 mb-4 px-3 py-2.5 bg-white/4 border border-white/6 rounded-xl">
                <div className="flex items-center" style={{ gap: 0 }}>
                  <Avatar src={agent.headshotUrl} name={agent.name} size={30} />
                  {lo && (
                    <div style={{ marginLeft: -10 }}>
                      <Avatar src={lo.headshotUrl} name={lo.name} size={30} />
                    </div>
                  )}
                </div>
                <div className="text-xs text-slate-500 leading-snug flex-1">
                  <span className="text-slate-300 font-semibold block">
                    {agent.name}{lo ? ` & ${lo.name}` : ''}
                  </span>
                  {lo ? 'Agent · Loan Officer — here to help' : 'Agent — here to help'}
                </div>
              </div>

              <p className="text-white font-bold text-sm text-center mb-4 leading-snug">
                Quick question —{' '}
                <span className="text-sky-300">what are you looking for?</span>
              </p>

              {/* Button: Schedule showing */}
              <button
                type="button"
                onClick={() => setMode('showing')}
                className="w-full flex items-center gap-3 bg-blue-600/15 border border-blue-500/30 text-sky-300 rounded-2xl p-4 mb-3 hover:bg-blue-600/25 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center text-xl flex-shrink-0">
                  📅
                </div>
                <div className="flex-1">
                  <span className="block font-bold text-sm">I want to see this home</span>
                  <span className="block text-xs text-sky-400 mt-0.5">
                    Schedule a showing with {agent.name.split(' ')[0]}
                  </span>
                </div>
                <span className="text-white/25 text-lg">›</span>
              </button>

              {/* Button: Pre-approval */}
              <button
                type="button"
                onClick={() => setMode('preapproval')}
                className="w-full flex items-center gap-3 bg-emerald-500/12 border border-emerald-500/25 text-emerald-300 rounded-2xl p-4 mb-3 hover:bg-emerald-500/20 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-xl flex-shrink-0">
                  ✅
                </div>
                <div className="flex-1">
                  <span className="block font-bold text-sm">I need pre-approval</span>
                  <span className="block text-xs text-emerald-400 mt-0.5">
                    {lo
                      ? `Connect with ${lo.name.split(' ')[0]} — no credit pull`
                      : `Get pre-approved fast`}
                  </span>
                </div>
                <span className="text-white/25 text-lg">›</span>
              </button>

              <button
                type="button"
                onClick={dismiss}
                className="w-full text-center text-xs text-slate-600 hover:text-slate-500 mt-1 py-1"
              >
                Not right now
              </button>
            </>
          )}

          {/* SHOWING FORM */}
          {mode === 'showing' && (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setMode('question')}
                  className="w-8 h-8 rounded-lg bg-white/7 border border-white/8 flex items-center justify-center text-slate-400 hover:text-slate-200 text-base flex-shrink-0"
                >
                  ‹
                </button>
                <div>
                  <div className="text-white font-bold text-sm">📅 Schedule a showing</div>
                  <div className="text-slate-500 text-xs mt-0.5">
                    {agent.name.split(' ')[0]} confirms within 1 hour
                  </div>
                </div>
              </div>

              {/* Contact fields */}
              <div className="flex flex-col gap-2 mb-3">
                <input
                  className="bg-white/6 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500/40 focus:bg-white/8"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <input
                  className="bg-white/6 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500/40 focus:bg-white/8"
                  placeholder="Email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <input
                  className="bg-white/6 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500/40 focus:bg-white/8"
                  placeholder="Phone (optional)"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                When works?
              </p>
              <div className="mb-3">
                <PillRow options={WHEN_OPTIONS} selected={when} onSelect={setWhen} color="blue" />
              </div>

              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Preferred time
              </p>
              <div className="mb-4">
                <PillRow options={TIME_OPTIONS} selected={time} onSelect={setTime} color="blue" />
              </div>

              {formError && (
                <p className="text-red-400 text-xs mb-2">{formError}</p>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl py-3 text-sm transition-all"
              >
                {submitting ? 'Sending…' : 'Request Showing →'}
              </button>
            </>
          )}

          {/* PRE-QUAL FORM */}
          {mode === 'preapproval' && (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setMode('question')}
                  className="w-8 h-8 rounded-lg bg-white/7 border border-white/8 flex items-center justify-center text-slate-400 hover:text-slate-200 text-base flex-shrink-0"
                >
                  ‹
                </button>
                <div>
                  <div className="text-white font-bold text-sm">✅ Quick pre-qual check</div>
                  <div className="text-slate-500 text-xs mt-0.5">
                    {lo
                      ? `${lo.name.split(' ')[0]} reviews & reaches out in under 1 hour`
                      : 'A loan specialist reaches out in under 1 hour'}
                  </div>
                </div>
              </div>

              {/* Contact fields */}
              <div className="flex flex-col gap-2 mb-4">
                <input
                  className="bg-white/6 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/40 focus:bg-white/8"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <input
                  className="bg-white/6 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/40 focus:bg-white/8"
                  placeholder="Email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <input
                  className="bg-white/6 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/40 focus:bg-white/8"
                  placeholder="Phone (optional)"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              {/* Q1: Purchase timeline */}
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                When are you looking to buy?
              </p>
              <div className="mb-3">
                <PillRow options={TIMELINE_OPTIONS} selected={purchaseTimeline} onSelect={setPurchaseTimeline} color="green" />
              </div>

              {/* Q2: Credit range */}
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Estimated credit score
              </p>
              <div className="mb-3">
                <PillRow options={CREDIT_OPTIONS} selected={creditRange} onSelect={setCreditRange} color="green" />
              </div>

              {/* Q3: Income range */}
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Annual household income
              </p>
              <div className="mb-3">
                <PillRow options={INCOME_OPTIONS} selected={incomeRange} onSelect={setIncomeRange} color="green" />
              </div>

              {/* Q4: Down payment */}
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Down payment available
              </p>
              <div className="mb-3">
                <PillRow options={DOWN_OPTIONS} selected={downPayment} onSelect={setDownPayment} color="green" />
              </div>

              {/* Q5: Property type */}
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Property will be used as
              </p>
              <div className="mb-4">
                <PillRow options={PROPERTY_OPTIONS} selected={propertyType} onSelect={setPropertyType} color="green" />
              </div>

              {formError && (
                <p className="text-red-400 text-xs mb-2">{formError}</p>
              )}

              <button
                type="button"
                onClick={handlePreQualSubmit}
                disabled={submitting}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl py-3 text-sm transition-all"
              >
                {submitting
                  ? 'Sending…'
                  : lo
                  ? `Send to ${lo.name.split(' ')[0]} →`
                  : 'Submit Pre-Qual →'}
              </button>

              <p className="text-center text-xs text-slate-600 mt-2">No credit pull. Takes 30 seconds.</p>
            </>
          )}
        </div>
      </div>

      {/* Slide-up animation */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .animate-slide-up {
          animation: slideUp 0.35s cubic-bezier(0.32, 0.72, 0, 1) both;
        }
      `}</style>
    </>
  );
};

export default LOContactSheet;
