import React, { useMemo, useRef, useState } from 'react';
import { Download, Eye, Image as ImageIcon, Palette, QrCode, Share2, Upload } from 'lucide-react';

type SocialLinks = {
  facebook: string;
  instagram: string;
  twitter: string;
  linkedin: string;
  youtube: string;
};

type AdminAICardForm = {
  fullName: string;
  professionalTitle: string;
  company: string;
  brandColor: string;
  phone: string;
  email: string;
  website: string;
  bio: string;
  social: SocialLinks;
  headshot: string | null;
  logo: string | null;
};

const createEmptyForm = (): AdminAICardForm => ({
  fullName: '',
  professionalTitle: '',
  company: '',
  brandColor: '#0d15e7',
  phone: '',
  email: '',
  website: '',
  bio: '',
  social: {
    facebook: '',
    instagram: '',
    twitter: '',
    linkedin: '',
    youtube: ''
  },
  headshot: null,
  logo: null
});

const AdminAICardClone: React.FC = () => {
  const [form, setForm] = useState<AdminAICardForm>(createEmptyForm);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [shareUrl] = useState<string>(() => `${window.location.origin}/admin/ai-card/preview`);
  const headshotInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const previewId = useMemo(() => 'admin-ai-business-card-preview', []);

  const handleChange = <K extends keyof AdminAICardForm>(key: K, value: AdminAICardForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSocialChange = (key: keyof SocialLinks, value: string) => {
    setForm((prev) => ({ ...prev, social: { ...prev.social, [key]: value } }));
  };

  const handleFileUpload = (file: File | null, target: 'headshot' | 'logo') => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setForm((prev) => ({ ...prev, [target]: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateQr = () => {
    setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareUrl)}`);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch (error) {
      console.warn('Copy failed', error);
    }
  };

  const handleDownload = async () => {
    const el = document.getElementById(previewId);
    if (!el) return;
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2 });
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'admin-ai-business-card.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">AI Business Card</h1>
          <p className="text-slate-600">Cloned Blueprint layout. Admin wiring to be added next.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
            <span className="material-symbols-outlined text-base">edit</span>
            Edit
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
            <Eye className="w-4 h-4" />
            Preview
          </button>
          <button
            onClick={handleGenerateQr}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <QrCode className="w-4 h-4" />
            QR Codes
          </button>
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <Share2 className="w-4 h-4" />
            Copy Link
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition">
            <span className="material-symbols-outlined text-base">save</span>
            Save
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-slate-800 font-semibold">
              <span className="material-symbols-outlined text-primary-600">badge</span>
              Basic Information
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">Full Name*</label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={form.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Professional Title*</label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={form.professionalTitle}
                  onChange={(e) => handleChange('professionalTitle', e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Company*</label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={form.company}
                  onChange={(e) => handleChange('company', e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                  <Palette className="w-4 h-4" />
                  Brand Color
                </label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={form.brandColor}
                  onChange={(e) => handleChange('brandColor', e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-slate-800 font-semibold">
              <span className="material-symbols-outlined text-primary-600">call</span>
              Contact Information
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">Phone Number*</label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={form.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Email Address*</label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-600">Website URL</label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={form.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  placeholder="https://"
                />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-slate-800 font-semibold">
              <ImageIcon className="w-4 h-4 text-primary-600" />
              Images
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-600">
                {form.headshot ? (
                  <img src={form.headshot} alt="Headshot" className="h-24 w-24 rounded-full object-cover" />
                ) : (
                  <span>Click to upload headshot</span>
                )}
                <button
                  onClick={() => headshotInputRef.current?.click()}
                  className="mt-2 inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <Upload className="w-4 h-4" />
                  Upload Headshot
                </button>
                <input
                  ref={headshotInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files?.[0] ?? null, 'headshot')}
                />
              </div>
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-600">
                {form.logo ? (
                  <img src={form.logo} alt="Logo" className="h-16 w-16 object-contain" />
                ) : (
                  <span>Click to upload logo</span>
                )}
                <button
                  onClick={() => logoInputRef.current?.click()}
                  className="mt-2 inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <Upload className="w-4 h-4" />
                  Upload Logo
                </button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files?.[0] ?? null, 'logo')}
                />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-slate-800 font-semibold">
              <span className="material-symbols-outlined text-primary-600">edit_note</span>
              Professional Bio
            </div>
            <textarea
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              rows={4}
              value={form.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              placeholder="Tell visitors about your experience and expertise..."
            />
            <p className="text-xs text-slate-500">{form.bio.length}/500 characters</p>
          </section>

          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-slate-800 font-semibold">
              <span className="material-symbols-outlined text-primary-600">link</span>
              Social Media Links
            </div>
            {([
              ['facebook', 'https://facebook.com/username'],
              ['instagram', 'https://instagram.com/username'],
              ['twitter', 'https://twitter.com/username'],
              ['linkedin', 'https://linkedin.com/in/username'],
              ['youtube', 'https://youtube.com/@username']
            ] as Array<[keyof SocialLinks, string]>).map(([key, placeholder]) => (
              <input
                key={key}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={form.social[key]}
                onChange={(e) => handleSocialChange(key, e.target.value)}
                placeholder={placeholder}
              />
            ))}
          </section>
        </div>

        <div className="space-y-4 lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Live Preview</h3>
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
            <div
              id={previewId}
              className="rounded-2xl border border-slate-200 shadow-lg overflow-hidden"
              style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f4f7ff 100%)' }}
            >
              <div className="h-3 w-full" style={{ backgroundColor: form.brandColor || '#0d15e7' }} />
              <div className="p-4 flex flex-col items-center text-center space-y-3">
                <div
                  className="h-16 w-16 rounded-full border-4 border-white shadow-sm overflow-hidden"
                  style={{ backgroundColor: form.brandColor || '#0d15e7' }}
                >
                  {form.headshot ? (
                    <img src={form.headshot} alt="Headshot" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{form.fullName || 'Full Name'}</p>
                  <p className="text-xs text-slate-500">{form.professionalTitle || 'Professional Title'}</p>
                  <p className="text-xs text-slate-500">{form.company || 'Company'}</p>
                </div>
                <div className="flex flex-col items-center gap-2 text-primary-600 text-sm">
                  {form.phone && <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-base">call</span>{form.phone}</span>}
                  {form.email && <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-base">mail</span>{form.email}</span>}
                  {form.website && <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-base">language</span>{form.website}</span>}
                </div>
                <button
                  className="mt-2 w-full rounded-lg px-4 py-2 text-sm font-semibold text-white shadow"
                  style={{ backgroundColor: form.brandColor || '#0d15e7' }}
                >
                  How can I help?
                </button>
                <button
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <Share2 className="w-4 h-4" />
                  Share Card
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">QR Codes</h3>
              <button
                onClick={handleGenerateQr}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
              >
                <QrCode className="w-4 h-4" />
                Generate
              </button>
            </div>
            {qrUrl ? (
              <div className="flex flex-col items-center gap-2">
                <img src={qrUrl} alt="AI card QR" className="h-40 w-40 object-contain" />
                <p className="text-[11px] text-slate-500 break-all text-center">{shareUrl}</p>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Generate a QR to share this admin AI card.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAICardClone;
