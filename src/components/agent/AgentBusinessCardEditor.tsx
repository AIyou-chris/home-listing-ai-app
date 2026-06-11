import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { AgentProfile } from '../../types';
import { supabase } from '../../services/supabase';
import { uploadAiCardAsset } from '../../services/aiCardService';
import { updateAgentProfile as updateCentralAgentProfile } from '../../services/agentProfileService';
import { showToast } from '../../utils/toastService';
import { buildApiUrl } from '../../lib/api';

interface AgentBusinessCardEditorProps {
  userProfile: AgentProfile;
  onSaveProfile: (profile: AgentProfile) => Promise<void>;
}

type FormState = {
  fullName: string;
  company: string;
  title: string;
  phone: string;
  email: string;
  website: string;
  headshotUrl: string;
  logoUrl: string;
  themeColor: string;
  nmlsNumber: string;
};

const DEFAULT_THEME_COLOR = '#2563eb';
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

const normalizeThemeColor = (value?: string | null) => {
  const trimmed = String(value || '').trim();
  return HEX_COLOR_PATTERN.test(trimmed) ? trimmed : DEFAULT_THEME_COLOR;
};

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read selected image.'));
    reader.readAsDataURL(file);
  });

const mapProfileToForm = (profile: AgentProfile): FormState => ({
  fullName: profile.name || '',
  company: profile.company || '',
  title: profile.title || '',
  phone: profile.phone || '',
  email: profile.email || '',
  website: profile.website || '',
  headshotUrl: profile.headshotUrl || '',
  logoUrl: profile.logoUrl || '',
  themeColor: normalizeThemeColor(profile.brandColor),
  nmlsNumber: profile.nmlsNumber || ''
});

const textInputClassName =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100';

const PreviewModalShell: React.FC<{
  open: boolean;
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ open, title, subtitle, onClose, children }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/65 p-4 backdrop-blur-sm md:items-center" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(27,41,70,0.92),rgba(11,19,38,0.96))] p-5 text-white shadow-[0_28px_80px_rgba(2,6,23,0.45)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">HomeListingAI</p>
            <h3 className="mt-1 text-2xl font-bold tracking-tight">{title}</h3>
            <p className="mt-1 text-sm text-slate-300">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 p-2 text-white transition hover:bg-white/10"
            aria-label="Close preview"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
};

const AgentBusinessCardEditor: React.FC<AgentBusinessCardEditorProps> = ({ userProfile, onSaveProfile }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const fromOnboarding = new URLSearchParams(location.search).get('from') === 'onboarding';
  const [form, setForm] = useState<FormState>(() => mapProfileToForm(userProfile));
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [chatPreviewOpen, setChatPreviewOpen] = useState(false);
  const [contactPreviewOpen, setContactPreviewOpen] = useState(false);
  const [tipDismissed, setTipDismissed] = useState(() => {
    try { return localStorage.getItem('hlai_profile_tip_dismissed') === '1'; } catch { return false; }
  });
  const dismissTip = () => {
    setTipDismissed(true);
    try { localStorage.setItem('hlai_profile_tip_dismissed', '1'); } catch { /* noop */ }
  };
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; role: 'agent' | 'user'; text: string }>>([
    {
      id: 'agent-1',
      role: 'agent',
      text: `Hi, I'm ${userProfile.name || 'your AI assistant'}. Ask me anything about this listing.`
    }
  ]);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    message: `Hi ${userProfile.name || 'there'}, I'd like more information about this property.`
  });

  useEffect(() => {
    setForm(mapProfileToForm(userProfile));
  }, [userProfile]);


  const handleFieldChange =
    (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const uploadToAvatarsBucket = async (file: File): Promise<string | null> => {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) return null;

    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const safeExtension = extension.replace(/[^a-z0-9]/gi, '') || 'jpg';
    const path = `${userId}/headshot.${safeExtension}`;

    const { error } = await supabase.storage.from('avatars').upload(path, file, {
      contentType: file.type || 'image/jpeg',
      upsert: true
    });

    if (error) return null;

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data?.publicUrl || path;
  };

  const handleHeadshotUpload = async (file?: File | null) => {
    if (!file) return;
    setErrorMessage('');
    setIsUploading(true);

    try {
      const avatarsUrl = await uploadToAvatarsBucket(file);
      if (avatarsUrl) {
        setForm((prev) => ({ ...prev, headshotUrl: avatarsUrl }));
        showToast.success('Headshot uploaded.');
        return;
      }

      const uploadResult = await uploadAiCardAsset('headshot', file);
      const fallbackUrl = uploadResult.url || uploadResult.path;
      if (fallbackUrl) {
        setForm((prev) => ({ ...prev, headshotUrl: fallbackUrl }));
        showToast.success('Headshot uploaded.');
        return;
      }

      throw new Error('Upload failed. Please use the image URL field.');
    } catch (error) {
      try {
        const localPreview = await readFileAsDataUrl(file);
        setForm((prev) => ({ ...prev, headshotUrl: localPreview }));
        showToast.info('Using local image preview only.');
      } catch {
        const message = error instanceof Error ? error.message : 'Unable to upload headshot.';
        setErrorMessage(message);
        showToast.error(message);
      }
    } finally {
      setIsUploading(false);
    }
  };


  const handleSave = async () => {
    setErrorMessage('');
    setIsSaving(true);

    try {
      const payload = {
        name: form.fullName.trim(),
        company: form.company.trim(),
        title: form.title.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        website: form.website.trim(),
        headshotUrl: form.headshotUrl.trim() || null,
        logoUrl: form.logoUrl.trim() || null,
        brandColor: normalizeThemeColor(form.themeColor)
      };

      // Save NMLS number to agents table via LO profile endpoint (no-ops for non-LO accounts)
      if (form.nmlsNumber.trim() !== (userProfile.nmlsNumber || '')) {
        const { data: authData } = await supabase.auth.getSession();
        const token = authData?.session?.access_token;
        if (token) {
          await fetch(buildApiUrl('/api/lo/profile'), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ nmls_number: form.nmlsNumber.trim() || null })
          });
        }
      }

      const saved = await updateCentralAgentProfile(payload);

      const mergedProfile: AgentProfile = {
        ...userProfile,
        name: saved.name || payload.name,
        company: saved.company || payload.company,
        title: saved.title || payload.title,
        phone: saved.phone || payload.phone,
        email: saved.email || payload.email,
        website: saved.website || payload.website || '',
        headshotUrl: saved.headshotUrl || payload.headshotUrl || '',
        logoUrl: saved.logoUrl || payload.logoUrl || '',
        brandColor: normalizeThemeColor(saved.brandColor || payload.brandColor),
        nmlsNumber: form.nmlsNumber.trim() || userProfile.nmlsNumber || ''
      };

      await onSaveProfile(mergedProfile);
      setForm(mapProfileToForm(mergedProfile));
      showToast.success('AI Business Card saved.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save AI Business Card.';
      setErrorMessage(message);
      showToast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendPreviewMessage = () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    setChatMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: 'user', text: trimmed },
      {
        id: `agent-${Date.now() + 1}`,
        role: 'agent',
        text: `Thanks. This preview chat is wired up. In the live app, this button will open the real listing conversation window.`
      }
    ]);
    setChatInput('');
  };

  const handleContactPreviewSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    showToast.success('Contact form preview submitted.');
    setContactPreviewOpen(false);
  };

  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] md:p-6">
      <div className="mb-5">
        <h3 className="text-xl font-bold text-slate-900">Your AI Business Card</h3>
        <p className="mt-1 text-sm text-slate-600">Used across listings, emails, flyers, and chat.</p>
      </div>

      {!tipDismissed && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-primary-100 bg-primary-50 px-4 py-3.5">
          <span className="material-symbols-outlined mt-0.5 flex-shrink-0 text-[18px] text-primary-500">auto_awesome</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-primary-900">Fill this out once — it works everywhere.</p>
            <p className="mt-0.5 text-xs text-primary-700 leading-relaxed">Your name, photo, and brand color automatically show up on every listing, share page, open house QR, and AI chat. One profile, zero repetition.</p>
          </div>
          <button type="button" onClick={dismissTip} className="flex-shrink-0 rounded-lg p-1 text-primary-400 hover:text-primary-700 transition-colors">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      <div className="space-y-6">
        <div className="space-y-4">
          {/* Headshot */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">Headshot</p>
            <p className="mt-1 text-xs text-slate-500">Your photo — shown on the business card, chat widget, and listing pages.</p>
            <div className="mt-3 flex items-center gap-4">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-white">
                {form.headshotUrl ? (
                  <img src={form.headshotUrl} alt="Headshot preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-400">
                    No photo
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100">
                  <span className="material-symbols-outlined text-[16px] text-slate-500">upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => void handleHeadshotUpload(event.target.files?.[0] || null)}
                  />
                  {isUploading ? 'Uploading...' : 'Upload photo'}
                </label>
                {form.headshotUrl && (
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, headshotUrl: '' }))}
                    className="text-xs text-slate-400 hover:text-rose-500 transition-colors text-left"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="business-card-full-name" className="mb-1.5 block text-sm font-medium text-slate-700">
              Full name
            </label>
            <input
              id="business-card-full-name"
              type="text"
              value={form.fullName}
              onChange={handleFieldChange('fullName')}
              className={textInputClassName}
              placeholder="Jane Doe"
            />
          </div>

          <div>
            <label htmlFor="business-card-company" className="mb-1.5 block text-sm font-medium text-slate-700">
              Company / Brokerage
            </label>
            <input
              id="business-card-company"
              type="text"
              value={form.company}
              onChange={handleFieldChange('company')}
              className={textInputClassName}
              placeholder="Acme Realty"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="business-card-title" className="mb-1.5 block text-sm font-medium text-slate-700">
                Title
              </label>
              <input
                id="business-card-title"
                type="text"
                value={form.title}
                onChange={handleFieldChange('title')}
                className={textInputClassName}
                placeholder="Licensed Realtor(R)"
              />
            </div>
            <div>
              <label htmlFor="business-card-nmls" className="mb-1.5 block text-sm font-medium text-slate-700">
                NMLS # <span className="text-slate-400 font-normal">(Loan Officers)</span>
              </label>
              <input
                id="business-card-nmls"
                type="text"
                value={form.nmlsNumber}
                onChange={handleFieldChange('nmlsNumber')}
                className={textInputClassName}
                placeholder="1234567"
                maxLength={20}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="business-card-phone" className="mb-1.5 block text-sm font-medium text-slate-700">
                Phone
              </label>
              <input
                id="business-card-phone"
                type="tel"
                value={form.phone}
                onChange={handleFieldChange('phone')}
                className={textInputClassName}
                placeholder="(555) 555-0100"
              />
            </div>
            <div>
              <label htmlFor="business-card-email" className="mb-1.5 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="business-card-email"
                type="email"
                value={form.email}
                onChange={handleFieldChange('email')}
                className={textInputClassName}
                placeholder="jane@acmerealty.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="business-card-website" className="mb-1.5 block text-sm font-medium text-slate-700">
              Website (optional)
            </label>
            <input
              id="business-card-website"
              type="url"
              value={form.website}
              onChange={handleFieldChange('website')}
              className={textInputClassName}
              placeholder="https://janedoe.com"
            />
            <p className="mt-1 text-xs text-slate-400">Shows as a link on every listing's contact card.</p>
          </div>

          <div>
            <label htmlFor="business-card-headshot-url" className="mb-1.5 block text-sm font-medium text-slate-700">
              Headshot URL (optional)
            </label>
            <input
              id="business-card-headshot-url"
              type="url"
              value={form.headshotUrl}
              onChange={handleFieldChange('headshotUrl')}
              className={textInputClassName}
              placeholder="https://..."
            />
          </div>

          <div>
            <label htmlFor="business-card-theme-color" className="mb-1.5 block text-sm font-medium text-slate-700">
              Theme color
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-slate-300 bg-white px-3 py-2.5 shadow-sm">
              <input
                id="business-card-theme-color"
                type="color"
                value={normalizeThemeColor(form.themeColor)}
                onChange={(event) => setForm((prev) => ({ ...prev, themeColor: normalizeThemeColor(event.target.value) }))}
                className="h-9 w-14 cursor-pointer rounded border-0 bg-transparent p-0"
                aria-label="Choose theme color"
              />
              <span className="text-sm text-slate-500">Pick your brand color</span>
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          )}

          <div className="pt-1">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving || isUploading}
              className="inline-flex min-w-[150px] items-center justify-center rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>

          <div className="pt-2">
            <p className="mb-3 text-sm font-semibold text-slate-700">Live preview — how buyers see you on your listing</p>
            {(() => {
              const color = normalizeThemeColor(form.themeColor);
              const hex = color.replace('#', '');
              const r = parseInt(hex.slice(0, 2), 16);
              const g = parseInt(hex.slice(2, 4), 16);
              const b = parseInt(hex.slice(4, 6), 16);
              const darken = (amt: number) => {
                const c = (ch: number) => Math.max(0, Math.min(255, ch + amt)).toString(16).padStart(2, '0');
                return `#${c(r + amt)}${c(g + amt)}${c(b + amt)}`;
              };
              const gradStart = darken(-30);
              const initial = (form.fullName || 'A')[0]?.toUpperCase() || 'A';
              return (
                <div
                  className="overflow-hidden rounded-[20px] p-[18px] text-white shadow-[0_8px_24px_rgba(15,23,42,0.25)]"
                  style={{ background: `linear-gradient(135deg, ${gradStart}, ${color})` }}
                >
                  <div className="flex items-center gap-3.5">
                    {form.headshotUrl ? (
                      <img src={form.headshotUrl} alt={form.fullName || 'Agent'} className="h-[58px] w-[58px] flex-shrink-0 rounded-full border-2 border-white/40 object-cover" />
                    ) : (
                      <div className="flex h-[58px] w-[58px] flex-shrink-0 items-center justify-center rounded-full border-2 border-white/40 bg-white/20 text-2xl font-black">
                        {initial}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xl font-black leading-none">{form.fullName || 'Your Name'}</p>
                        <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide">{form.title || 'Listing Agent'}</span>
                      </div>
                      <p className="mt-1 text-xs opacity-80">{form.company || 'Your Brokerage'}{form.website ? ` · ${form.website.replace(/^https?:\/\//, '')}` : ''}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <div className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 text-[13px] font-extrabold" style={{ color: gradStart }}>📞 Call</div>
                    <div className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/30 bg-white/15 py-2.5 text-[13px] font-extrabold text-white">✉️ Message</div>
                    <div className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/30 bg-white/15 py-2.5 text-[13px] font-extrabold text-white">📅 Tour</div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {fromOnboarding && (
          <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <span className="material-symbols-outlined flex-shrink-0 text-[20px] text-emerald-600">rocket_launch</span>
              <div>
                <p className="text-sm font-semibold text-emerald-900">Profile saved — ready to build your listing</p>
                <p className="text-xs text-emerald-700">Your info is set. Continue to create your first AI listing.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/dashboard/onboarding?step=2')}
              className="flex-shrink-0 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition-colors"
            >
              Continue →
            </button>
          </div>
        )}

      </div>

      <PreviewModalShell
        open={chatPreviewOpen}
        onClose={() => setChatPreviewOpen(false)}
        title="Chat preview"
        subtitle="This is the window your Chat With Me button will open."
      >
        <div className="rounded-[24px] border border-white/10 bg-slate-950/40 p-4">
          <div className="max-h-[340px] space-y-3 overflow-y-auto pr-1">
            {chatMessages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[82%] rounded-[22px] px-4 py-3 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-[#ff8a1f] to-[#ff5c1f] text-white'
                      : 'border border-white/10 bg-white/8 text-slate-100'
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleSendPreviewMessage();
                }
              }}
              placeholder="Type a message..."
              className="flex-1 rounded-[18px] border border-white/10 bg-white/8 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-400 focus:border-white/20"
            />
            <button
              type="button"
              onClick={handleSendPreviewMessage}
              className="rounded-[18px] bg-gradient-to-r from-[#ff8a1f] to-[#ff5c1f] px-4 py-3 text-sm font-bold text-white"
            >
              Send
            </button>
          </div>
        </div>
      </PreviewModalShell>

      <PreviewModalShell
        open={contactPreviewOpen}
        onClose={() => setContactPreviewOpen(false)}
        title="Contact form preview"
        subtitle="This is the form your Contact button will open."
      >
        <form onSubmit={handleContactPreviewSubmit} className="space-y-4 rounded-[24px] border border-white/10 bg-slate-950/40 p-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-200">Your name</label>
            <input
              type="text"
              value={contactForm.name}
              onChange={(event) => setContactForm((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full rounded-[18px] border border-white/10 bg-white/8 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-400 focus:border-white/20"
              placeholder="Chris Potter"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-200">Email</label>
            <input
              type="email"
              value={contactForm.email}
              onChange={(event) => setContactForm((prev) => ({ ...prev, email: event.target.value }))}
              className="w-full rounded-[18px] border border-white/10 bg-white/8 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-400 focus:border-white/20"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-200">Message</label>
            <textarea
              value={contactForm.message}
              onChange={(event) => setContactForm((prev) => ({ ...prev, message: event.target.value }))}
              rows={4}
              className="w-full rounded-[18px] border border-white/10 bg-white/8 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-400 focus:border-white/20"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setContactPreviewOpen(false)}
              className="rounded-[18px] border border-white/10 bg-white/8 px-4 py-3 text-sm font-semibold text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-[18px] bg-gradient-to-r from-[#1d4ed8] to-[#2563eb] px-4 py-3 text-sm font-bold text-white"
            >
              Send message
            </button>
          </div>
        </form>
      </PreviewModalShell>
    </div>
  );
};

export default AgentBusinessCardEditor;
