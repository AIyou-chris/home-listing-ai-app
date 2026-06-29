// src/components/listing/ListingAlertOptIn.tsx
import React, { useState } from 'react';
import { subscribeToListingAlerts } from '../../services/listingAlerts';

interface Props { listingId: string; visitorId?: string; }

const ListingAlertOptIn: React.FC<Props> = ({ listingId, visitorId }) => {
  const [phone, setPhone] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.replace(/\D/g, '').length < 10) { setState('error'); return; }
    setState('sending');
    try {
      await subscribeToListingAlerts(listingId, phone, visitorId);
      setState('done');
    } catch {
      setState('error');
    }
  };

  if (state === 'done') {
    return (
      <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-4 text-center text-cyan-200">
        ✅ You're set — we'll text you the moment the price changes on this home.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-cyan-500/30 bg-[#0f1b2e] p-4">
      <div className="text-sm font-semibold text-cyan-300">🔔 Get price-drop alerts</div>
      <p className="mt-1 text-xs text-slate-400">Get a text the second the price changes or an open house is set.</p>
      <input
        type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
        placeholder="(555) 555-1234"
        className="mt-3 w-full rounded-xl bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500"
      />
      <button
        type="submit" disabled={state === 'sending'}
        className="mt-2 w-full rounded-xl bg-cyan-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {state === 'sending' ? 'Saving…' : 'Text me alerts'}
      </button>
      {state === 'error' && <p className="mt-2 text-xs text-rose-400">Please enter a valid phone number.</p>}
      <p className="mt-2 text-[10px] leading-tight text-slate-500">
        By tapping, you agree to get texts about this home. Msg &amp; data rates may apply. Reply STOP to opt out.
      </p>
    </form>
  );
};

export default ListingAlertOptIn;
