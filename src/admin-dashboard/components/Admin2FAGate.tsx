import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';

// Wraps the admin dashboard. If the signed-in admin has a verified TOTP factor
// but this session hasn't passed it yet (AAL1 -> AAL2 needed), block with a code
// prompt until verified. Admins without 2FA pass straight through (opt-in).
const Admin2FAGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<'checking' | 'challenge' | 'ok'>('checking');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const check = useCallback(async () => {
    try {
      const { data, error: aalErr } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalErr) { setState('ok'); return; } // fail open — never lock out on an API hiccup
      if (data?.currentLevel === 'aal1' && data?.nextLevel === 'aal2') setState('challenge');
      else setState('ok');
    } catch {
      setState('ok');
    }
  }, []);

  useEffect(() => { void check(); }, [check]);

  const verify = async () => {
    if (code.trim().length < 6) { setError('Enter the 6-digit code'); return; }
    setBusy(true); setError('');
    try {
      const { data: factors, error: fErr } = await supabase.auth.mfa.listFactors();
      if (fErr) throw fErr;
      const factor = (factors?.totp || []).find((f) => f.status === 'verified');
      if (!factor) { setState('ok'); return; }
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: factor.id });
      if (chErr) throw chErr;
      const { error: vErr } = await supabase.auth.mfa.verify({ factorId: factor.id, challengeId: ch.id, code: code.trim() });
      if (vErr) throw vErr;
      setState('ok');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Incorrect code — try again');
    } finally {
      setBusy(false);
    }
  };

  if (state === 'ok') return <>{children}</>;

  if (state === 'checking') {
    return (
      <div className='min-h-screen flex items-center justify-center bg-slate-50'>
        <div className='animate-spin h-8 w-8 rounded-full border-2 border-slate-300 border-t-blue-600' />
      </div>
    );
  }

  // Challenge screen
  return (
    <div className='min-h-screen flex items-center justify-center bg-slate-900 px-4'>
      <div className='w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl text-center'>
        <div className='text-3xl mb-3'>🔐</div>
        <h1 className='text-xl font-bold text-slate-900'>Two-factor verification</h1>
        <p className='mt-1 text-sm text-slate-500'>Enter the 6-digit code from your authenticator app.</p>
        <input
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={(e) => e.key === 'Enter' && verify()}
          inputMode='numeric'
          placeholder='000000'
          className='mt-5 w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-2xl tracking-[0.4em] font-mono focus:outline-none focus:ring-2 focus:ring-blue-500'
        />
        {error && <p className='mt-2 text-sm font-semibold text-rose-600'>{error}</p>}
        <button onClick={verify} disabled={busy} className='mt-4 w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50'>
          {busy ? 'Verifying…' : 'Verify'}
        </button>
        <button onClick={() => supabase.auth.signOut().then(() => { window.location.href = '/admin-login'; })}
          className='mt-3 text-xs text-slate-400 hover:text-slate-600'>
          Sign out
        </button>
      </div>
    </div>
  );
};

export default Admin2FAGate;
