import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { FeatureSection } from './SettingsCommon';

// ─── Two-Factor Authentication Section ───────────────────────────────────────

const TwoFactorSection: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'enabled' | 'disabled'>('loading')
  const [factorId, setFactorId] = useState<string | null>(null)
  const [enrolling, setEnrolling] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [enrollFactorId, setEnrollFactorId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      const totp = data?.totp?.find(f => f.status === 'verified')
      if (totp) { setStatus('enabled'); setFactorId(totp.id) }
      else setStatus('disabled')
    }).catch(() => setStatus('disabled'))
  }, [])

  const startEnroll = async () => {
    setError(null); setEnrolling(true)
    try {
      const { data, error: err } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Authenticator App' })
      if (err || !data) throw err
      setQrCode(data.totp.qr_code)
      setSecret(data.totp.secret)
      setEnrollFactorId(data.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start setup')
    } finally { setEnrolling(false) }
  }

  const verifyEnroll = async () => {
    if (!enrollFactorId || code.length !== 6) return
    setError(null); setVerifying(true)
    try {
      const { data: challenge } = await supabase.auth.mfa.challenge({ factorId: enrollFactorId })
      if (!challenge) throw new Error('Challenge failed')
      const { error: verifyErr } = await supabase.auth.mfa.verify({ factorId: enrollFactorId, challengeId: challenge.id, code })
      if (verifyErr) throw verifyErr
      setStatus('enabled'); setFactorId(enrollFactorId)
      setQrCode(null); setSecret(null); setEnrollFactorId(null); setCode('')
      setSuccess('2-step verification enabled.')
    } catch {
      setError('Invalid code. Check your authenticator and try again.')
    } finally { setVerifying(false) }
  }

  const remove2FA = async () => {
    if (!factorId || !window.confirm('Remove 2-step verification? Your account will only require a password to sign in.')) return
    setRemoving(true); setError(null)
    try {
      const { error: err } = await supabase.auth.mfa.unenroll({ factorId })
      if (err) throw err
      setStatus('disabled'); setFactorId(null); setSuccess('2-step verification removed.')
    } catch { setError('Failed to remove. Try again.') }
    finally { setRemoving(false) }
  }

  const cancelEnroll = async () => {
    if (enrollFactorId) await supabase.auth.mfa.unenroll({ factorId: enrollFactorId }).catch(() => {})
    setQrCode(null); setSecret(null); setEnrollFactorId(null); setCode(''); setError(null)
  }

  return (
    <FeatureSection title="2-Step Verification" icon="verified_user" iconClassName="text-green-600">
      <div className="space-y-4">
        {success && <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm">{success}</div>}
        {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}

        {status === 'loading' && <p className="text-sm text-slate-400">Checking status…</p>}

        {status === 'enabled' && !qrCode && (
          <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-bold text-green-800">Enabled</span>
                <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">Active</span>
              </div>
              <p className="text-xs text-green-700">Your account requires a code from your authenticator app on every login.</p>
            </div>
            <button onClick={remove2FA} disabled={removing}
              className="flex-shrink-0 ml-4 px-4 py-2 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 disabled:opacity-50 transition-all">
              {removing ? 'Removing…' : 'Remove'}
            </button>
          </div>
        )}

        {status === 'disabled' && !qrCode && (
          <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-slate-800 mb-0.5">Not enabled</p>
              <p className="text-xs text-slate-500">Add a second layer of security — require a code from Google Authenticator or Authy on every login.</p>
            </div>
            <button onClick={startEnroll} disabled={enrolling}
              className="flex-shrink-0 ml-4 px-4 py-2.5 rounded-xl bg-primary-600 text-white text-xs font-bold hover:bg-primary-700 disabled:opacity-50 transition-all">
              {enrolling ? 'Setting up…' : 'Set Up'}
            </button>
          </div>
        )}

        {qrCode && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div>
              <p className="text-sm font-bold text-slate-900 mb-1">Scan with your authenticator app</p>
              <p className="text-xs text-slate-500">Use Google Authenticator, Authy, or 1Password to scan the QR code below.</p>
            </div>
            <div className="flex justify-center">
              <img src={qrCode} alt="2FA QR Code" className="w-44 h-44 rounded-lg border border-slate-200" />
            </div>
            {secret && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Can't scan? Enter this code manually</p>
                <p className="text-xs font-mono text-slate-700 break-all select-all">{secret}</p>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Enter the 6-digit code from your app</label>
              <input
                type="text" inputMode="numeric" pattern="\d{6}" maxLength={6}
                value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={e => e.key === 'Enter' && verifyEnroll()}
                placeholder="000000"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-lg font-mono tracking-[0.4em] text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={verifyEnroll} disabled={verifying || code.length !== 6}
                className="flex-1 bg-primary-600 text-white font-bold rounded-xl py-2.5 text-sm hover:bg-primary-700 disabled:opacity-50 transition-all">
                {verifying ? 'Verifying…' : 'Confirm & Enable →'}
              </button>
              <button onClick={cancelEnroll}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-semibold hover:bg-slate-50 transition-all">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </FeatureSection>
  )
}

interface SecuritySettingsProps {
    // Assuming security settings structure based on usage in SettingsPage
    settings: {
        loginNotifications?: boolean;
        sessionTimeout?: number;
        analyticsEnabled?: boolean;
        twoFactorEnabled?: boolean;
    };
    onSaveSettings: (settings: SecuritySettingsProps['settings']) => Promise<void>;
    onBack?: () => void;
    isLoading?: boolean;
}

const SecuritySettingsPage: React.FC<SecuritySettingsProps> = ({
    settings,
    onSaveSettings,
    onBack: _onBack,
    isLoading = false
}) => {
    const [passwords, setPasswords] = useState({
        newPassword: '',
        confirmNewPassword: ''
    });

    // Local state for toggles to allow immediate feedback before save
    const [localSettings, setLocalSettings] = useState(settings);
    const [isSecuritySaving, setIsSecuritySaving] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPasswords(prev => ({ ...prev, [name]: value }));
    };

    const isPasswordValid =
        passwords.newPassword.length >= 8 &&
        /[A-Z]/.test(passwords.newPassword) &&
        /[0-9]/.test(passwords.newPassword) &&
        /[^A-Za-z0-9]/.test(passwords.newPassword) &&
        passwords.newPassword === passwords.confirmNewPassword;

    const handlePasswordSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordMessage(null);

        if (!isPasswordValid) return;

        try {
            const { error } = await supabase.auth.updateUser({
                password: passwords.newPassword
            });

            if (error) throw error;

            setPasswordMessage({ type: 'success', text: 'Password updated successfully' });
            setPasswords({ newPassword: '', confirmNewPassword: '' });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to update password';
            setPasswordMessage({ type: 'error', text: message });
        }
    };

    const handleSecurityToggle = (key: string, value: boolean | number) => {
        const newSettings = { ...localSettings, [key]: value };
        setLocalSettings(newSettings);
        // We probably want to save immediately for toggles or wait for a button. 
        // In SettingsPage it seemed there was a save button for security settings distinct from password.
        // But for toggles usually auto-save is nice.
        // Let's stick to the manual save if there is a button, or auto-save.
        // The original code had a "Save Security Settings" button.
    };

    const handleSettingsSave = async () => {
        setIsSecuritySaving(true);
        try {
            await onSaveSettings(localSettings);
        } finally {
            setIsSecuritySaving(false);
        }
    };

    return (
        <div className="p-8 space-y-8 animate-fadeIn">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">🔐 Security Settings</h2>
                <p className="text-slate-500 mt-1">Manage your account security, passwords, and privacy settings.</p>
            </div>

            <form onSubmit={handlePasswordSave}>
                <FeatureSection title="Change Password" icon="lock" iconClassName="text-blue-600">
                    <div className="space-y-6">
                        {passwordMessage && (
                            <div className={`p-4 rounded-lg text-sm ${passwordMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {passwordMessage.text}
                            </div>
                        )}
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5">info</span>
                                <div>
                                    <h4 className="font-medium text-blue-900">Password Security</h4>
                                    <p className="text-sm text-blue-800 mt-1">
                                        Use a strong password with at least 8 characters, including letters, numbers, and symbols.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">New Password</label>
                                <input
                                    type="password"
                                    name="newPassword"
                                    autoComplete="new-password"
                                    value={passwords.newPassword}
                                    onChange={handlePasswordChange}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter new password"
                                />
                                <div className="mt-2">
                                    <div className="text-xs text-slate-500 space-y-1">
                                        <div className={`flex items-center gap-2 ${passwords.newPassword.length >= 8 ? 'text-green-600 font-medium' : ''}`}>
                                            <span className={`w-2 h-2 rounded-full ${passwords.newPassword.length >= 8 ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                                            At least 8 characters
                                        </div>
                                        <div className={`flex items-center gap-2 ${/[A-Z]/.test(passwords.newPassword) ? 'text-green-600 font-medium' : ''}`}>
                                            <span className={`w-2 h-2 rounded-full ${/[A-Z]/.test(passwords.newPassword) ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                                            One uppercase letter
                                        </div>
                                        <div className={`flex items-center gap-2 ${/[0-9]/.test(passwords.newPassword) ? 'text-green-600 font-medium' : ''}`}>
                                            <span className={`w-2 h-2 rounded-full ${/[0-9]/.test(passwords.newPassword) ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                                            One number
                                        </div>
                                        <div className={`flex items-center gap-2 ${/[^A-Za-z0-9]/.test(passwords.newPassword) ? 'text-green-600 font-medium' : ''}`}>
                                            <span className={`w-2 h-2 rounded-full ${/[^A-Za-z0-9]/.test(passwords.newPassword) ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                                            One special character
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Confirm New Password</label>
                                <input
                                    type="password"
                                    name="confirmNewPassword"
                                    autoComplete="new-password"
                                    value={passwords.confirmNewPassword}
                                    onChange={handlePasswordChange}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Confirm new password"
                                />
                                {passwords.confirmNewPassword && passwords.newPassword !== passwords.confirmNewPassword && (
                                    <p className="text-sm text-red-600 mt-1">Passwords do not match</p>
                                )}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={!isPasswordValid}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors shadow-sm"
                        >
                            Update Password
                        </button>
                    </div>
                </FeatureSection>
            </form>

            <TwoFactorSection />

            <FeatureSection title="Account Security" icon="security" iconClassName="text-purple-600">
                <div className="space-y-4">

                    <div className="flex items-center justify-between p-4 bg-purple-50 border border-purple-100 rounded-lg">
                        <div>
                            <h4 className="font-medium text-purple-900">Login Notifications</h4>
                            <p className="text-sm text-purple-700/80">Get notified when someone logs into your account</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={localSettings.loginNotifications !== false}
                                onChange={(e) => handleSecurityToggle('loginNotifications', e.target.checked)}
                                className="sr-only peer"
                                disabled={isLoading || isSecuritySaving}
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-purple-50 border border-purple-100 rounded-lg">
                        <div>
                            <h4 className="font-medium text-purple-900">Session Timeout</h4>
                            <p className="text-sm text-purple-700/80">Automatically log out after inactivity</p>
                        </div>
                        <select
                            value={localSettings.sessionTimeout || 24}
                            onChange={(e) => handleSecurityToggle('sessionTimeout', parseInt(e.target.value))}
                            className="px-3 py-1 border border-purple-200 bg-white text-purple-900 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 cursor-pointer"
                            disabled={isLoading || isSecuritySaving}
                        >
                            <option value={1}>1 hour</option>
                            <option value={4}>4 hours</option>
                            <option value={8}>8 hours</option>
                            <option value={24}>24 hours</option>
                            <option value={0}>Never</option>
                        </select>
                    </div>
                </div>
            </FeatureSection>

            <FeatureSection title="Privacy & Data" icon="privacy_tip" iconClassName="text-teal-600">
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-teal-50 border border-teal-100 rounded-lg">
                        <div>
                            <h4 className="font-medium text-teal-900">Analytics & Usage Data</h4>
                            <p className="text-sm text-teal-700/80">Help improve the app by sharing anonymous usage data</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={localSettings.analyticsEnabled !== false}
                                onChange={(e) => handleSecurityToggle('analyticsEnabled', e.target.checked)}
                                className="sr-only peer"
                                disabled={isLoading || isSecuritySaving}
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                        </label>
                    </div>
                </div>
            </FeatureSection>

            <div className="flex items-center justify-end pt-8 border-t border-slate-200">
                <button
                    type="button"
                    onClick={handleSettingsSave}
                    disabled={isSecuritySaving || isLoading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isSecuritySaving ? 'Saving…' : 'Save Security Settings'}
                </button>
            </div>
        </div>
    );
};

export default SecuritySettingsPage;
