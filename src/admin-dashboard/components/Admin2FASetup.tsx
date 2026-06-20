import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../services/supabase';

// Real TOTP 2FA via Supabase Auth MFA. Opt-in: an admin enrolls their own
// authenticator app here; login enforcement lives in Admin2FAGate + verifyAdmin.
type Factor = { id: string; status: string; friendly_name?: string | null };

const Admin2FASetup: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [verifiedFactor, setVerifiedFactor] = useState<Factor | null>(null);
  const [enroll, setEnroll] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      const totp = (data?.totp || []) as Factor[];
      setVerifiedFactor(totp.find((f) => f.status === 'verified') || null);
    } catch (e) {
      console.error('[2FA] listFactors failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const startEnroll = async () => {
    setBusy(true);
    try {
      // Clear any stale unverified factor so enroll doesn't collide.
      const { data: list } = await supabase.auth.mfa.listFactors();
      for (const f of ((list?.totp || []) as Factor[]).filter((x) => x.status !== 'verified')) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `admin-${Date.now()}` });
      if (error) throw error;
      setEnroll({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not start 2FA setup');
    } finally {
      setBusy(false);
    }
  };

  const confirmEnroll = async () => {
    if (!enroll || code.trim().length < 6) { toast.error('Enter the 6-digit code'); return; }
    setBusy(true);
    try {
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: enroll.factorId });
      if (chErr) throw chErr;
      const { error: vErr } = await supabase.auth.mfa.verify({ factorId: enroll.factorId, challengeId: ch.id, code: code.trim() });
      if (vErr) throw vErr;
      toast.success('🔐 Two-factor authentication enabled');
      setEnroll(null); setCode('');
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Code did not verify — try again');
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (!verifiedFactor) return;
    if (!confirm('Turn off two-factor authentication for your admin account?')) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: verifiedFactor.id });
      if (error) throw error;
      toast.success('2FA disabled');
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not disable 2FA');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className='p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3'>
      <div className='flex items-center justify-between'>
        <div>
          <h4 className='font-semibold text-slate-900'>Two-Factor Authentication</h4>
          <p className='text-sm text-slate-600'>Require an authenticator code at admin login.</p>
        </div>
        {!loading && (
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${verifiedFactor ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
            {verifiedFactor ? 'ON' : 'OFF'}
          </span>
        )}
      </div>

      {loading ? (
        <p className='text-xs text-slate-400'>Checking…</p>
      ) : verifiedFactor ? (
        <div className='space-y-2'>
          <p className='text-xs text-emerald-700'>✓ Active — you’ll be asked for a code each admin login.</p>
          <button onClick={disable} disabled={busy} className='rounded-lg border border-rose-200 text-rose-600 px-3 py-1.5 text-xs font-semibold hover:bg-rose-50 disabled:opacity-50'>
            Disable 2FA
          </button>
        </div>
      ) : enroll ? (
        <div className='space-y-3'>
          <p className='text-xs text-slate-600'>Scan this with Google Authenticator, Authy, or 1Password:</p>
          <img src={enroll.qr} alt='2FA QR code' className='w-40 h-40 bg-white rounded-lg border border-slate-200' />
          <p className='text-[11px] text-slate-500 break-all'>Or enter this key manually: <span className='font-mono text-slate-700'>{enroll.secret}</span></p>
          <div className='flex gap-2'>
            <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode='numeric'
              placeholder='6-digit code' className='w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm tracking-widest font-mono' />
            <button onClick={confirmEnroll} disabled={busy} className='rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-800 disabled:opacity-50'>
              {busy ? 'Verifying…' : 'Verify & enable'}
            </button>
          </div>
          <button onClick={() => { setEnroll(null); setCode(''); }} className='text-xs text-slate-400 hover:text-slate-600'>Cancel</button>
        </div>
      ) : (
        <button onClick={startEnroll} disabled={busy} className='rounded-lg bg-blue-600 text-white px-3 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50'>
          {busy ? 'Starting…' : 'Set up 2FA'}
        </button>
      )}
    </div>
  );
};

export default Admin2FASetup;
