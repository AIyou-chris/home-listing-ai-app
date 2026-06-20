import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../services/supabase';

// Real admin password change: verify the current password, then update it.
const AdminChangePassword: React.FC = () => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const update = async () => {
    if (!current || !next) { toast.error('Fill in all fields'); return; }
    if (next.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    if (next !== confirm) { toast.error('New passwords don’t match'); return; }
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email;
      if (!email) { toast.error('Session expired — sign in again'); return; }

      // Verify the current password before allowing a change.
      const { error: verifyErr } = await supabase.auth.signInWithPassword({ email, password: current });
      if (verifyErr) { toast.error('Current password is incorrect'); return; }

      const { error: updErr } = await supabase.auth.updateUser({ password: next });
      if (updErr) throw updErr;

      toast.success('🔒 Password updated');
      setCurrent(''); setNext(''); setConfirm('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className='p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3'>
      <h4 className='font-semibold text-slate-900'>Change Password</h4>
      <input type='password' placeholder='Current password' value={current} onChange={(e) => setCurrent(e.target.value)}
        className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm' />
      <input type='password' placeholder='New password (min 8 chars)' value={next} onChange={(e) => setNext(e.target.value)}
        className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm' />
      <input type='password' placeholder='Confirm new password' value={confirm} onChange={(e) => setConfirm(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && update()}
        className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm' />
      <button onClick={update} disabled={busy}
        className='inline-flex items-center gap-2 rounded-lg bg-slate-900 text-white px-3 py-2 text-sm hover:bg-slate-800 disabled:opacity-50'>
        {busy ? 'Updating…' : 'Update'}
      </button>
    </div>
  );
};

export default AdminChangePassword;
