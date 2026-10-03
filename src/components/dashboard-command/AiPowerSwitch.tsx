import React, { useEffect, useState } from 'react';
import { buildApiUrl } from '../../lib/api';
import { authHeaders } from '../../services/dashboard/utils';
import { showToast } from '../../utils/toastService';

// The one on/off switch for an LO's AI (listing chat + phone). Saves the moment it's flipped.

const getHeaders = async (): Promise<HeadersInit> => authHeaders(null);

export const AI_POWER_EVENT = 'hlai-ai-power';

const AiPowerSwitch: React.FC<{ demo?: boolean }> = ({ demo = false }) => {
  const [on, setOn] = useState<boolean | null>(demo ? true : null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (demo) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(buildApiUrl('/api/lo/chatbot-config'), { headers: await getHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setOn(data.is_active !== false);
      } catch { /* switch stays hidden if the brain can't be reached */ }
    })();
    const sync = (e: Event) => setOn(Boolean((e as CustomEvent<{ on: boolean }>).detail?.on));
    window.addEventListener(AI_POWER_EVENT, sync);
    return () => { cancelled = true; window.removeEventListener(AI_POWER_EVENT, sync); };
  }, [demo]);

  if (on === null) return null;

  const flip = async () => {
    if (saving) return;
    const next = !on;
    if (demo) { setOn(next); return; }
    setOn(next);
    setSaving(true);
    try {
      const res = await fetch(buildApiUrl('/api/lo/chatbot-config'), { method: 'PUT', headers: await getHeaders(), body: JSON.stringify({ is_active: next }) });
      if (!res.ok) throw new Error('save_failed');
      window.dispatchEvent(new CustomEvent(AI_POWER_EVENT, { detail: { on: next } }));
    } catch {
      setOn(!next);
      showToast.error('Could not change that. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`flex items-center justify-between gap-4 rounded-2xl border px-5 py-4 shadow-sm ${on ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
      <div className="min-w-0">
        <p className={`text-lg font-bold ${on ? 'text-green-800' : 'text-red-800'}`}>My AI is {on ? 'ON' : 'OFF'}</p>
        <p className="mt-0.5 text-sm text-slate-600">
          {on
            ? 'Answering buyers in your listing chat and on your phone.'
            : 'Listing chat sends buyers to you, and calls ring your cell.'}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="My AI"
        disabled={saving}
        onClick={() => void flip()}
        className={`relative h-9 w-16 shrink-0 rounded-full transition-colors disabled:opacity-70 ${on ? 'bg-green-600' : 'bg-red-500'}`}
      >
        <span className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow transition-all ${on ? 'left-8' : 'left-1'}`} />
      </button>
    </div>
  );
};

export default AiPowerSwitch;
