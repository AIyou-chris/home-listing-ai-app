import React, { useEffect, useState } from 'react';
import { buildApiUrl } from '../../lib/api';

// Four single-tap questions, then a name and mobile number. The buyer never
// types an answer, so it stays under 30 seconds on a phone.

export interface PreApprovalLo {
  name: string;
  photo: string | null;
  nmls: string | null;
}

interface PreApprovalSheetProps {
  open: boolean;
  onClose: () => void;
  listingId: string;
  propertyType?: string;
  lo: PreApprovalLo | null;
}

type AnswerKey = 'timeline' | 'preapproved' | 'credit' | 'down';

const QUESTIONS: Array<{ key: AnswerKey; label: string; options: string[] }> = [
  { key: 'timeline', label: 'When do you want to buy?', options: ['ASAP', '1–3 months', '3–6 months', 'Just looking'] },
  { key: 'preapproved', label: 'Already pre-approved?', options: ['Yes', 'Not yet'] },
  { key: 'credit', label: 'Credit score range', options: ['740+', '680–739', '620–679', 'Under 620', 'Not sure'] },
  { key: 'down', label: 'Down payment', options: ['Under 5%', '5–10%', '10–20%', '20%+'] }
];

const initials = (name: string) =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'LO';

const PreApprovalSheet: React.FC<PreApprovalSheetProps> = ({ open, onClose, listingId, propertyType, lo }) => {
  const [answers, setAnswers] = useState<Partial<Record<AnswerKey, string>>>({});
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const loName = lo?.name || 'your loan officer';
  const loFirst = loName.split(' ')[0] || 'your loan officer';
  const answered = QUESTIONS.filter((q) => answers[q.key]).length;
  const digits = phone.replace(/\D/g, '');
  const phoneOk = digits.length >= 10;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  // A buyer gives a name plus ONE way to reach them: phone or email, their choice.
  const canSend = firstName.trim().length > 0 && (phoneOk || emailOk) && !sending;

  const submit = async () => {
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(buildApiUrl('/api/leads/pre-qual'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listingId,
          full_name: firstName.trim(),
          phone: phoneOk ? phone.trim() : null,
          email: emailOk ? email.trim() : null,
          purchase_timeline: answers.timeline || null,
          currently_preapproved: answers.preapproved ? answers.preapproved === 'Yes' : null,
          credit_range: answers.credit || null,
          down_payment: answers.down || null,
          property_type: propertyType || null
        })
      });
      if (!res.ok) throw new Error('send_failed');
      setSent(true);
    } catch {
      setError('Could not send. Please check your details and try again.');
    } finally {
      setSending(false);
    }
  };

  const close = () => {
    onClose();
    // Reset after the sheet is gone so a second visit starts clean.
    setTimeout(() => { setSent(false); setAnswers({}); setError(null); }, 300);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Get pre-approved">
      <button type="button" aria-label="Close" onClick={close} className="absolute inset-0 bg-slate-900/60" />
      <div className="relative max-h-[94vh] w-full max-w-[420px] overflow-y-auto rounded-t-3xl bg-white p-5 text-slate-900 shadow-2xl sm:rounded-3xl">
        {sent ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
            </div>
            <h2 className="text-2xl font-bold">Got it, {firstName.trim()}!</h2>
            <p className="text-[17px] leading-snug text-slate-600">
              {phoneOk ? `${loFirst} will text or call you today, usually within the hour.` : `${loFirst} will email you today, usually within the hour.`}
            </p>
            <button type="button" onClick={close} className="mt-2 h-[52px] w-full rounded-2xl border-[1.5px] border-slate-300 text-[17px] font-semibold">
              Back to the home
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center gap-3">
              {lo?.photo ? (
                <img src={lo.photo} alt={loName} className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-800 text-[15px] font-bold text-white">{initials(loName)}</div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold">{loName}</p>
                <p className="text-xs text-slate-600">Loan officer{lo?.nmls ? ` · NMLS ${lo.nmls}` : ''}</p>
              </div>
              <p className="text-[13px] font-semibold text-green-800">{answered} of {QUESTIONS.length}</p>
            </div>
            <div className="h-1.5 rounded-full bg-slate-200">
              <div className="h-1.5 rounded-full bg-green-800 transition-all" style={{ width: `${(answered / QUESTIONS.length) * 100}%` }} />
            </div>

            {QUESTIONS.map((q, i) => (
              <fieldset key={q.key} className="flex flex-col gap-2">
                <legend className="mb-2 text-[15px] font-semibold">{i + 1}. {q.label}</legend>
                <div className="flex flex-wrap gap-2">
                  {q.options.map((opt) => {
                    const selected = answers[q.key] === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setAnswers((prev) => ({ ...prev, [q.key]: opt }))}
                        className={`min-h-[44px] rounded-full border-[1.5px] px-4 text-[15px] ${selected
                          ? 'border-green-800 bg-green-800 font-semibold text-white'
                          : 'border-slate-300 bg-white font-medium text-slate-900'}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}

            <div className="flex flex-col gap-2">
              <p className="text-[15px] font-semibold">Where should {loFirst} reach you?</p>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                aria-label="First name"
                autoComplete="given-name"
                className="h-12 w-full rounded-xl border-[1.5px] border-slate-300 px-3.5 text-base"
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Mobile number"
                aria-label="Mobile number"
                autoComplete="tel"
                inputMode="tel"
                className="h-12 w-full rounded-xl border-[1.5px] border-slate-300 px-3.5 text-base"
              />
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-semibold text-slate-400">or</span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                aria-label="Email address"
                autoComplete="email"
                inputMode="email"
                className="h-12 w-full rounded-xl border-[1.5px] border-slate-300 px-3.5 text-base"
              />
              {firstName.trim().length > 0 && !phoneOk && !emailOk && (phone.length > 0 || email.length > 0) && (
                <p className="text-xs text-slate-500">Add a mobile number or an email so {loFirst} can get back to you.</p>
              )}
            </div>

            {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}

            <button
              type="button"
              onClick={submit}
              disabled={!canSend}
              className="h-[52px] rounded-2xl bg-green-800 text-[17px] font-semibold text-white disabled:opacity-50"
            >
              {sending ? 'Sending…' : `Send to ${loFirst}`}
            </button>
            <p className="text-[11px] leading-snug text-slate-500">
              No credit check. This is not a loan application or a commitment to lend. {loName}{lo?.nmls ? `, NMLS ${lo.nmls},` : ''} may contact you by text, phone or email. Reply STOP to opt out of texts.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreApprovalSheet;
