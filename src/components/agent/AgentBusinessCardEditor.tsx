import React, { useEffect, useMemo, useState } from 'react';
import type { AgentProfile } from '../../types';
import { supabase } from '../../services/supabase';
import { uploadAiCardAsset } from '../../services/aiCardService';
import { updateAgentProfile as updateCentralAgentProfile } from '../../services/agentProfileService';
import { showToast } from '../../utils/toastService';
import AgentBusinessCard from './AgentBusinessCard';

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
  headshotUrl: string;
  themeColor: string;
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
  headshotUrl: profile.headshotUrl || '',
  themeColor: normalizeThemeColor(profile.brandColor)
});

const textInputClassName =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100';

const AgentBusinessCardEditor: React.FC<AgentBusinessCardEditorProps> = ({ userProfile, onSaveProfile }) => {
  const [form, setForm] = useState<FormState>(() => mapProfileToForm(userProfile));
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setForm(mapProfileToForm(userProfile));
  }, [userProfile]);

  const hasAnyIdentityValue = useMemo(
    () =>
      Boolean(
        form.fullName.trim() ||
          form.company.trim() ||
          form.title.trim() ||
          form.phone.trim() ||
          form.email.trim() ||
          form.headshotUrl.trim()
      ),
    [form]
  );

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
        headshotUrl: form.headshotUrl.trim() || null,
        brandColor: normalizeThemeColor(form.themeColor)
      };

      const saved = await updateCentralAgentProfile(payload);

      const mergedProfile: AgentProfile = {
        ...userProfile,
        name: saved.name || payload.name,
        company: saved.company || payload.company,
        title: saved.title || payload.title,
        phone: saved.phone || payload.phone,
        email: saved.email || payload.email,
        headshotUrl: saved.headshotUrl || payload.headshotUrl || '',
        brandColor: normalizeThemeColor(saved.brandColor || payload.brandColor)
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

  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] md:p-6">
      <div className="mb-5">
        <h3 className="text-xl font-bold text-slate-900">Your AI Business Card</h3>
        <p className="mt-1 text-sm text-slate-600">Used across listings, emails, flyers, and chat.</p>
      </div>

      {!hasAnyIdentityValue && (
        <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Add your info once. We’ll reuse it everywhere.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">Headshot</p>
            <p className="mt-1 text-xs text-slate-500">Upload an image, or paste a direct image URL below.</p>
            <div className="mt-3 flex items-center gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-full border border-slate-200 bg-white">
                {form.headshotUrl ? (
                  <img src={form.headshotUrl} alt="Headshot preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-400">
                    No photo
                  </div>
                )}
              </div>
              <label className="inline-flex cursor-pointer items-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => void handleHeadshotUpload(event.target.files?.[0] || null)}
                />
                {isUploading ? 'Uploading...' : 'Upload headshot'}
              </label>
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
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <p className="mb-3 text-sm font-semibold text-slate-700">Live preview</p>
          <AgentBusinessCard
            fullName={form.fullName}
            company={form.company}
            title={form.title}
            phone={form.phone}
            email={form.email}
            headshotUrl={form.headshotUrl || null}
            themeColor={normalizeThemeColor(form.themeColor)}
            onChat={() => console.log('[AgentBusinessCard] Chat clicked')}
            onContact={() => console.log('[AgentBusinessCard] Contact me clicked')}
          />
        </div>
      </div>
    </div>
  );
};

export default AgentBusinessCardEditor;
