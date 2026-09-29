import React, { useState } from 'react';
import { buildApiUrl } from '../../lib/api';
import { supabase } from '../../services/supabase';
import { showToast } from '../../utils/toastService';

// A listing's own AI phone number. Calls share the LO's monthly AI minutes.
// Opens under a listing card: pick an area code -> we hold a number -> LO taps "Get this number".

export interface ListingPhoneLine {
  status: string;
  listingId?: string | null;
  phoneNumber: string | null;
  reservedNumber: string | null;
  reservationExpiresAt: string | null;
  error: string | null;
  isTest: boolean;
}

const getHeaders = async (): Promise<HeadersInit> => {
  const { data: { session } } = await supabase.auth.getSession();
  const { data } = await supabase.auth.getUser();
  return {
    'Content-Type': 'application/json',
    ...(data.user?.id ? { 'x-user-id': data.user.id } : {}),
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
  };
};

const prettyPhone = (e164: string | null) => {
  const d = String(e164 || '').replace(/\D/g, '').slice(-10);
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : String(e164 || '');
};

const ERROR_TEXT: Record<string, string> = {
  listing_numbers_need_lo_plan: 'Listing numbers come with the LO and LO Pro plans.',
  phone_not_enabled: 'AI phone numbers are not turned on for your account yet.',
  listing_access_denied: 'You can only add a number to your own listings.'
};

const ListingPhonePanel: React.FC<{
  listingId: string;
  line: ListingPhoneLine | null;
  demo?: boolean;
  onChange: (line: ListingPhoneLine | null) => void;
}> = ({ listingId, line, demo = false, onChange }) => {
  const [areaCode, setAreaCode] = useState('');
  const [busy, setBusy] = useState<'' | 'find' | 'buy'>('');

  const fail = (data: { error?: string; message?: string; line?: { error?: string | null } }, fallback: string) =>
    showToast.error((data.error && ERROR_TEXT[data.error]) || data.message || data.line?.error || fallback);

  const find = async () => {
    const code = areaCode.replace(/\D/g, '');
    if (!/^[2-9]\d{2}$/.test(code)) { showToast.error('Enter a 3-digit US area code, like 509.'); return; }
    setBusy('find');
    try {
      if (demo) {
        onChange({ status: 'searching', phoneNumber: null, reservedNumber: `+1${code}5550142`, reservationExpiresAt: new Date(Date.now() + 15 * 60000).toISOString(), error: null, isTest: true });
        return;
      }
      const res = await fetch(buildApiUrl(`/api/lo/listings/${listingId}/phone-line/preview`), { method: 'POST', headers: await getHeaders(), body: JSON.stringify({ areaCode: code }) });
      const data = await res.json().catch(() => ({}));
      if (data.line) onChange(data.line);
      if (!res.ok) fail(data, 'Could not find a number there. Try a nearby area code.');
    } catch {
      showToast.error('Could not reach the phone service. Try again.');
    } finally { setBusy(''); }
  };

  const buy = async () => {
    setBusy('buy');
    try {
      if (demo) {
        onChange(line ? { ...line, status: 'active', phoneNumber: line.reservedNumber, reservedNumber: null } : line);
        showToast.success('Demo number set up.');
        return;
      }
      const res = await fetch(buildApiUrl(`/api/lo/listings/${listingId}/phone-line/buy`), { method: 'POST', headers: await getHeaders(), body: JSON.stringify({ confirm: true }) });
      const data = await res.json().catch(() => ({}));
      if (data.line) onChange(data.line);
      if (res.ok) showToast.success('This home has its own AI phone number.');
      else fail(data, 'Could not get that number. Try again.');
    } catch {
      showToast.error('Could not reach the phone service. Try again.');
    } finally { setBusy(''); }
  };

  if (line?.phoneNumber) {
    return (
      <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">This home's AI phone number</p>
        <p className="text-2xl font-bold text-slate-900">{prettyPhone(line.phoneNumber)}</p>
        <p className="mt-1 text-sm text-slate-600">
          {line.isTest
            ? "Practice number: it can't ring."
            : 'Put it on the sign and the ads. Your AI answers about this home 24/7. Calls use your monthly AI minutes.'}
        </p>
      </div>
    );
  }

  if (line?.reservedNumber) {
    const until = line.reservationExpiresAt ? new Date(line.reservationExpiresAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
    return (
      <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <p className="text-sm font-semibold text-blue-900">We found a local number for this home:</p>
        <p className="text-2xl font-bold text-slate-900">{prettyPhone(line.reservedNumber)}</p>
        <p className="text-sm text-blue-900">Held for you{until ? ` until ${until}` : ''}. Included in your plan.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" disabled={busy !== ''} onClick={() => void buy()} className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-700 disabled:opacity-40">
            {busy === 'buy' ? 'Setting it up…' : 'Get this number'}
          </button>
          <button type="button" disabled={busy !== ''} onClick={() => onChange(null)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white disabled:opacity-40">
            Try another area code
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-sm font-semibold text-slate-800">Give this home its own AI phone number</p>
      <p className="text-sm text-slate-500">Buyers call it from the sign. Your AI answers about this home and passes hot callers to you.</p>
      {line?.error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{line.error}</p>}
      <div className="mt-2 flex gap-2">
        <input
          inputMode="numeric"
          maxLength={3}
          placeholder="Area code, like 509"
          value={areaCode}
          onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => { if (e.key === 'Enter') void find(); }}
          className="w-40 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          aria-label="Area code"
        />
        <button type="button" disabled={busy !== ''} onClick={() => void find()} className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-700 disabled:opacity-40">
          {busy === 'find' ? 'Finding…' : 'Find a number'}
        </button>
      </div>
    </div>
  );
};

export default ListingPhonePanel;
