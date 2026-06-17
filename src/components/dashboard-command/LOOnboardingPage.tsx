import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildDashboardPath, useDemoMode } from '../../demo/useDemoMode';
import { buildApiUrl } from '../../lib/api';
import { supabase } from '../../services/supabase';
import { showToast } from '../../utils/toastService';

// ─── US States list ──────────────────────────────────────────────────────────
const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'
];

// ─── Multi-select state dropdown ─────────────────────────────────────────────
const StatesMultiSelect: React.FC<{
  selected: string[];
  onChange: (states: string[]) => void;
}> = ({ selected, onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = search.trim()
    ? US_STATES.filter(s => s.toLowerCase().includes(search.toLowerCase()))
    : US_STATES;

  const toggle = (state: string) => {
    onChange(selected.includes(state) ? selected.filter(s => s !== state) : [...selected, state]);
  };

  const removeState = (state: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter(s => s !== state));
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full min-h-[42px] rounded-lg border border-slate-300 px-3 py-2 text-sm text-left focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white flex flex-wrap gap-1.5 items-center"
      >
        {selected.length === 0 ? (
          <span className="text-slate-400">Select states…</span>
        ) : (
          <>
            {selected.map(s => (
              <span key={s} className="inline-flex items-center gap-1 rounded-md bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-700">
                {s}
                <span
                  onClick={(e) => removeState(s, e)}
                  className="cursor-pointer text-primary-400 hover:text-primary-700 leading-none"
                >×</span>
              </span>
            ))}
          </>
        )}
        <span className="ml-auto text-slate-400 text-xs flex-shrink-0">
          {open ? '▲' : '▼'}
        </span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
          {/* Search */}
          <div className="p-2 border-b border-slate-100">
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search states…"
              className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
            />
          </div>
          {/* Select all / clear */}
          <div className="flex gap-2 px-3 py-1.5 border-b border-slate-100">
            <button type="button" onClick={() => onChange(US_STATES)} className="text-xs text-primary-600 font-semibold hover:underline">Select all</button>
            <span className="text-slate-300">|</span>
            <button type="button" onClick={() => onChange([])} className="text-xs text-slate-500 font-semibold hover:underline">Clear</button>
            {selected.length > 0 && <span className="ml-auto text-xs text-slate-400">{selected.length} selected</span>}
          </div>
          {/* State list */}
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-xs text-slate-400">No states match "{search}"</p>
            ) : (
              filtered.map(state => (
                <label key={state} className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.includes(state)}
                    onChange={() => toggle(state)}
                    className="accent-primary-600 w-4 h-4 flex-shrink-0"
                  />
                  <span className="text-sm text-slate-700">{state}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const cardClass = 'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm';

const STEP_COUNT = 3;
const clamp = (n: number) => Math.max(1, Math.min(STEP_COUNT, n));

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });

const getApiHeaders = async (): Promise<HeadersInit> => {
  const { data: { session } } = await supabase.auth.getSession();
  const { data } = await supabase.auth.getUser();
  return {
    'Content-Type': 'application/json',
    ...(data.user?.id ? { 'x-user-id': data.user.id } : {}),
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
  };
};

// ─── Component ────────────────────────────────────────────────────────────────
const LOOnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const demoMode = useDemoMode();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1 — LO profile
  const [profile, setProfile] = useState({
    full_name: '',
    nmls_number: '',
    state_license_number: '',
    company: '',
    phone: '',
    email: '',
    headshot_url: ''
  });
  const [selectedStates, setSelectedStates] = useState<string[]>([]);

  // Step 2 — Invite realtor (optional)
  const [invite, setInvite] = useState({ realtor_name: '', realtor_email: '' });
  const [inviteSent, setInviteSent] = useState(false);

  // Step 3 — first-win test lead
  const [testLeadSent, setTestLeadSent] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  const handleSendTestLead = async () => {
    if (sendingTest) return;
    setSendingTest(true);
    try {
      if (demoMode) {
        await new Promise((r) => setTimeout(r, 900));
        setTestLeadSent(true);
        showToast.success('Test lead sent! Check your 🔔 and 📧');
        return;
      }
      const headers = await getApiHeaders();
      const res = await fetch(buildApiUrl('/api/lo/test-lead'), { method: 'POST', headers });
      if (!res.ok) throw new Error();
      setTestLeadSent(true);
      showToast.success('Test lead sent! Check your 🔔 and 📧');
    } catch {
      showToast.error('Could not send test lead. Try again.');
    } finally {
      setSendingTest(false);
    }
  };

  // Pre-fill email from auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) {
        setProfile((prev) => ({ ...prev, email: prev.email || data.user!.email! }));
      }
    });
  }, []);

  const handleHeadshotUpload = async (file?: File | null) => {
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setProfile((prev) => ({ ...prev, headshot_url: dataUrl }));
    } catch {
      showToast.error('Failed to attach image.');
    }
  };

  const handleSaveProfile = async () => {
    if (!profile.full_name.trim()) {
      showToast.error('Your name is required.');
      return;
    }
    setSaving(true);
    try {
      const headers = await getApiHeaders();
      const res = await fetch(buildApiUrl('/api/lo/profile'), {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          full_name: profile.full_name.trim(),
          nmls_number: profile.nmls_number.trim() || null,
          state_license_number: profile.state_license_number.trim() || null,
          company: profile.company.trim() || null,
          phone: profile.phone.trim() || null,
          headshot_url: profile.headshot_url || null,
          lending_states: selectedStates
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save profile');
      }
      showToast.success('Profile saved.');
      setStep(2);
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendInvite = async () => {
    if (!invite.realtor_email.trim()) {
      showToast.error('Enter a realtor email to invite.');
      return;
    }
    setSaving(true);
    try {
      const headers = await getApiHeaders();
      const res = await fetch(buildApiUrl('/api/lo/invite-realtor'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          realtor_name: invite.realtor_name.trim() || null,
          realtor_email: invite.realtor_email.trim().toLowerCase()
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to send invite');
      }
      setInviteSent(true);
      showToast.success("Invite sent! They'll get an email with next steps.");
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to send invite.');
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      // Mark onboarding complete
      const headers = await getApiHeaders();
      const { data } = await supabase.auth.getUser();
      await fetch(buildApiUrl('/api/dashboard/onboarding'), {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          agentId: data.user?.id,
          onboarding_completed: true,
          onboarding_step: 3
        })
      });
      navigate(buildDashboardPath('/today', demoMode));
    } catch {
      // Non-fatal — go to dashboard anyway
      navigate(buildDashboardPath('/today', demoMode));
    } finally {
      setSaving(false);
    }
  };

  const progressPercent = Math.round((step / STEP_COUNT) * 100);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 md:px-8">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Let's get you set up</h1>
        <p className="mt-1 text-sm text-slate-600">
          Takes about 2 minutes. You can always update this later from Settings.
        </p>
      </header>

      {/* Progress bar */}
      <section className={cardClass}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Step {step} of {STEP_COUNT}
          </p>
          <p className="text-xs text-slate-500">{progressPercent}% complete</p>
        </div>
        <div className="mt-2 h-2 rounded-full bg-slate-100">
          <div
            className="h-2 rounded-full bg-primary-600 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {/* Step pills */}
        <div className="mt-4 flex gap-2">
          {(['Your LO profile', 'Invite a realtor', 'You\'re live'] as const).map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(clamp(i + 1))}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                step === i + 1
                  ? 'bg-primary-600 text-white'
                  : step > i + 1
                  ? 'bg-slate-200 text-slate-700'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* ─── Step 1 — LO Profile ─────────────────────────────────────────── */}
      {step === 1 && (
        <section className={cardClass}>
          <h2 className="text-xl font-semibold text-slate-900">Your LO profile</h2>
          <p className="mt-1 text-sm text-slate-600">
            This is what buyers and realtors see on every marketing piece you co-brand.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {/* Full name */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                Full name <span className="text-red-500">*</span>
              </label>
              <input
                value={profile.full_name}
                onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
                placeholder="Jane Smith"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            {/* NMLS */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                NMLS # <span className="text-slate-400 font-normal normal-case">(recommended)</span>
              </label>
              <input
                value={profile.nmls_number}
                onChange={(e) => setProfile((p) => ({ ...p, nmls_number: e.target.value }))}
                placeholder="1234567"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <p className="mt-1 text-xs text-slate-400">Federal license — required on most marketing</p>
            </div>

            {/* State License # */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                State License #
              </label>
              <input
                value={profile.state_license_number}
                onChange={(e) => setProfile((p) => ({ ...p, state_license_number: e.target.value }))}
                placeholder="e.g. LO-12345"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <p className="mt-1 text-xs text-slate-400">Your state-issued mortgage license number</p>
            </div>

            {/* Company */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                Company / lender
              </label>
              <input
                value={profile.company}
                onChange={(e) => setProfile((p) => ({ ...p, company: e.target.value }))}
                placeholder="First National Mortgage"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                Phone
              </label>
              <input
                value={profile.phone}
                onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                placeholder="(555) 000-0000"
                type="tel"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                Contact email
              </label>
              <input
                value={profile.email}
                onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                placeholder="jane@lender.com"
                type="email"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            {/* Headshot */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                Headshot (optional)
              </label>
              <div className="flex items-center gap-4">
                {profile.headshot_url && (
                  <img
                    src={profile.headshot_url}
                    alt="Headshot preview"
                    className="h-16 w-16 rounded-full object-cover border border-slate-200"
                  />
                )}
                <label className="cursor-pointer rounded-lg border border-dashed border-slate-300 px-4 py-2.5 text-sm text-slate-600 hover:border-primary-400 hover:text-primary-600 transition-colors">
                  {profile.headshot_url ? 'Change photo' : 'Upload photo'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => void handleHeadshotUpload(e.target.files?.[0])}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* States licensed in */}
          <div className="mt-6">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
              States you're licensed in
            </label>
            <p className="mb-2 text-xs text-slate-400">
              Shown on your LO AI chatbot so buyers know if you can help them.
            </p>
            <StatesMultiSelect selected={selectedStates} onChange={setSelectedStates} />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleSaveProfile()}
              disabled={saving || !profile.full_name.trim()}
              className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-primary-700 transition-colors"
            >
              {saving ? 'Saving…' : 'Save & Continue'}
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={saving}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              Skip for now
            </button>
          </div>
        </section>
      )}

      {/* ─── Step 2 — Invite realtor ─────────────────────────────────────── */}
      {step === 2 && (
        <section className={cardClass}>
          <h2 className="text-xl font-semibold text-slate-900">Invite your first realtor partner</h2>
          <p className="mt-1 text-sm text-slate-600">
            Your brand and theirs appear side by side on every listing. You control what shows.
          </p>

          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">How it works</p>
            <ul className="mt-2 space-y-1 text-slate-600">
              <li>• You invite a realtor by email</li>
              <li>• They get a link to create their free account</li>
              <li>• You link them to a listing — both brands show up</li>
              <li>• Buyer leads go to both of you</li>
            </ul>
          </div>

          {inviteSent ? (
            <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="font-semibold text-green-800">Invite sent to {invite.realtor_email}</p>
              <p className="mt-1 text-sm text-green-700">
                They'll get an email with next steps. You can add more partners from your dashboard.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                  Realtor name (optional)
                </label>
                <input
                  value={invite.realtor_name}
                  onChange={(e) => setInvite((p) => ({ ...p, realtor_name: e.target.value }))}
                  placeholder="John Realtor"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                  Realtor email
                </label>
                <input
                  value={invite.realtor_email}
                  onChange={(e) => setInvite((p) => ({ ...p, realtor_email: e.target.value }))}
                  placeholder="john@realty.com"
                  type="email"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            {!inviteSent && (
              <button
                type="button"
                onClick={() => void handleSendInvite()}
                disabled={saving || !invite.realtor_email.trim()}
                className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-primary-700 transition-colors"
              >
                {saving ? 'Sending…' : 'Send Invite'}
              </button>
            )}
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={saving}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              {inviteSent ? 'Continue' : 'Skip for now'}
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={saving}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-500 disabled:opacity-50"
            >
              ← Back
            </button>
          </div>
        </section>
      )}

      {/* ─── Step 3 — Done ───────────────────────────────────────────────── */}
      {step === 3 && (
        <section className={cardClass}>
          <div className="text-center py-4">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <span className="text-3xl">🎉</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">You're set up.</h2>
            <p className="mt-2 text-sm text-slate-600 max-w-sm mx-auto">
              Your LO platform is ready. Add listings, invite realtor partners,
              and start routing buyer leads directly to you.
            </p>
          </div>

          {/* First-win moment — feel the speed-to-lead engine before you do anything else */}
          <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-center">
            {!testLeadSent ? (
              <>
                <p className="text-sm font-bold text-blue-900">See it work right now 👇</p>
                <p className="mt-1 text-xs text-blue-700 max-w-md mx-auto">
                  Send yourself a test buyer lead. It lands in your pipeline and your alert fires —
                  exactly what happens the moment a real buyer raises their hand.
                </p>
                <button
                  type="button"
                  onClick={() => void handleSendTestLead()}
                  disabled={sendingTest}
                  className="mt-4 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white disabled:opacity-50 hover:bg-blue-700 transition-colors"
                >
                  {sendingTest ? 'Sending…' : '🔔 Send me a test lead'}
                </button>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-green-800">Boom — that's a real lead. 🎉</p>
                <p className="mt-1 text-xs text-green-700 max-w-md mx-auto">
                  Check your <strong>🔔 bell</strong> and <strong>📧 inbox</strong> — a warm buyer is sitting in your pipeline now.
                  That's exactly how fast you'll know when a real one comes in.
                </p>
                <button
                  type="button"
                  onClick={() => navigate(buildDashboardPath('/lo-leads', demoMode))}
                  className="mt-4 rounded-xl bg-green-600 px-6 py-3 text-sm font-bold text-white hover:bg-green-700 transition-colors"
                >
                  Open my Leads →
                </button>
              </>
            )}
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Next</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">Add your first listing</p>
              <p className="mt-1 text-xs text-slate-500">Create an AI listing page for a property</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Next</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">Train your LO AI</p>
              <p className="mt-1 text-xs text-slate-500">Upload rate sheets, FAQs, your pitch</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Next</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">Set up billing</p>
              <p className="mt-1 text-xs text-slate-500">5-day trial is running — upgrade anytime</p>
            </div>
          </div>

          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => void handleFinish()}
              disabled={saving}
              className="rounded-xl bg-primary-600 px-6 py-3 text-sm font-bold text-white disabled:opacity-50 hover:bg-primary-700 transition-colors"
            >
              {saving ? 'Loading…' : 'Go to My Dashboard →'}
            </button>
          </div>
        </section>
      )}
    </div>
  );
};

export default LOOnboardingPage;
