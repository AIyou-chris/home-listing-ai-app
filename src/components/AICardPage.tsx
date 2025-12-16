import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Phone, Mail, Globe, Facebook, Instagram, Twitter, Linkedin, Youtube, QrCode, Download, Eye, Palette, Share2, ChevronDown, ChevronUp } from 'lucide-react';
import QRCodeManagementPage from './QRCodeManagementPage';
import { getAICardProfile, updateAICardProfile, generateQRCode, shareAICard, downloadAICard, uploadAiCardAsset, type AICardProfile } from '../services/aiCardService';
import { supabase } from '../services/supabase';
import { setPreferredLanguage } from '../services/languagePreferenceService';
import { notifyProfileChange } from '../services/agentProfileService';
import ChatBotFAB from './ChatBotFAB';
import { DEMO_AI_CARD_PROFILE } from '../constants';

type EditableElement = HTMLInputElement | HTMLTextAreaElement;

// Use the AICardProfile type from the service
type AgentProfile = AICardProfile;

const createEmptySocialLinks = (): AgentProfile['socialMedia'] => ({
  facebook: '',
  instagram: '',
  twitter: '',
  linkedin: '',
  youtube: ''
});

const createDefaultProfile = (): AgentProfile => ({
  id: 'default',
  fullName: '',
  professionalTitle: '',
  company: '',
  phone: '',
  email: '',
  website: '',
  bio: '',
  brandColor: '#0ea5e9',
  language: 'en',
  socialMedia: createEmptySocialLinks(),
  headshot: null,
  logo: null
});

const mapToCentralProfile = (profile: AgentProfile) => ({
  id: profile.id,
  name: profile.fullName,
  title: profile.professionalTitle,
  company: profile.company,
  phone: profile.phone,
  email: profile.email,
  website: profile.website,
  bio: profile.bio,
  headshotUrl: profile.headshot,
  logoUrl: profile.logo,
  brandColor: profile.brandColor,
  language: profile.language,
  socialMedia: profile.socialMedia,
  created_at: profile.created_at,
  updated_at: profile.updated_at
});

const AICardPage: React.FC<{ isDemoMode?: boolean }> = ({ isDemoMode = false }) => {
  const [form, setForm] = useState<AgentProfile>(() => createDefaultProfile());

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [showDemoNotice, setShowDemoNotice] = useState(isDemoMode);

  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'qr-codes'>('edit');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    // Check if we're on mobile (screen width < 768px)
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    return {
      basic: isMobile,
      contact: isMobile,
      images: isMobile,
      bio: isMobile,
      social: isMobile
    };
  });
  const headshotInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [isHelpPanelOpen, setIsHelpPanelOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const hasUnsavedChangesRef = useRef(false);
  const serverProfileRef = useRef<AgentProfile | null>(null);

  const sanitizeAssetValue = (
    value: string | null | undefined,
    fallback: string | null | undefined
  ): string | null => {
    if (value === null) return null;
    if (value === undefined) return fallback ?? null;
    const normalized = value.toString();
    if (normalized.startsWith('blob:')) {
      return fallback ?? null;
    }
    return normalized;
  };

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Unable to read file as data URL'));
        }
      };
      reader.onerror = () => {
        reject(reader.error ?? new Error('FileReader failed'));
      };
      reader.readAsDataURL(file);
    });

  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChangesRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const persistForm = useCallback(async (overrides?: Partial<AgentProfile>) => {
    if (isDemoMode) {
      // In demo mode, just update local state without saving
      console.log('[AI Card Demo] Changes not saved in demo mode');
      setShowDemoNotice(true);
      setTimeout(() => setShowDemoNotice(false), 3000);
      // return form; // This line is removed as per the instruction's implied replacement
    }
    setIsSaving(true);
    try {
      if (isDemoMode) {
        console.log('[AI Card] Saving to LocalStorage (Smart Demo Save)');
        const mockSaved = { ...form, ...overrides };

        // Save to Browser Memory
        localStorage.setItem('ai_card_demo_data', JSON.stringify(mockSaved));

        setForm(mockSaved);
        setHasUnsavedChanges(false);
        serverProfileRef.current = mockSaved;
        return mockSaved;
      }

      const formUpdates = overrides; // Renaming for clarity based on the provided snippet's intent
      const base = serverProfileRef.current
        ? { ...serverProfileRef.current, ...form }
        : { ...form };
      const payload = formUpdates ? { ...base, ...formUpdates } : base;

      const sanitizedPayload: Partial<AgentProfile> = {
        ...payload,
        headshot: sanitizeAssetValue(payload.headshot, serverProfileRef.current?.headshot ?? null),
        logo: sanitizeAssetValue(payload.logo, serverProfileRef.current?.logo ?? null)
      };

      const fallback = serverProfileRef.current ?? createDefaultProfile();
      const ensureValue = (value: string | null | undefined, fallbackValue: string): string => {
        if (typeof value === 'string' && value.trim().length > 0) return value;
        if (typeof value === 'string') return value;
        return fallbackValue;
      };

      sanitizedPayload.fullName = ensureValue(sanitizedPayload.fullName, fallback.fullName);
      sanitizedPayload.professionalTitle = ensureValue(sanitizedPayload.professionalTitle, fallback.professionalTitle);
      sanitizedPayload.company = sanitizedPayload.company ?? fallback.company;
      sanitizedPayload.phone = sanitizedPayload.phone ?? fallback.phone;
      sanitizedPayload.email = sanitizedPayload.email ?? fallback.email;
      sanitizedPayload.website = sanitizedPayload.website ?? fallback.website;
      sanitizedPayload.bio = sanitizedPayload.bio ?? fallback.bio;
      sanitizedPayload.brandColor = sanitizedPayload.brandColor ?? fallback.brandColor;
      sanitizedPayload.socialMedia = sanitizedPayload.socialMedia ?? fallback.socialMedia;
      console.log('[AI Card] persistForm payload', sanitizedPayload)
      const savedProfile = await updateAICardProfile(sanitizedPayload);
      console.log('[AI Card] persistForm response', savedProfile)
      setForm(savedProfile);
      setHasUnsavedChanges(false);
      notifyProfileChange(mapToCentralProfile(savedProfile));
      serverProfileRef.current = savedProfile;
      if (savedProfile.language) {
        void setPreferredLanguage(savedProfile.language, { persist: false })
      }
      return savedProfile;
    } catch (error) {
      console.error('Failed to save profile changes:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [form, isDemoMode]);

  // Load profile on component mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true);
        if (isDemoMode) {
          // 1. Try LocalStorage (Smart Save)
          const stored = localStorage.getItem('ai_card_demo_data');
          if (stored) {
            const parsed = JSON.parse(stored);
            setForm(parsed);
            serverProfileRef.current = parsed;
          } else {
            // 2. Fallback to Generic Demo Data (Wipe admin data)
            setForm(DEMO_AI_CARD_PROFILE as AgentProfile);
            serverProfileRef.current = DEMO_AI_CARD_PROFILE as AgentProfile;
          }
          setHasUnsavedChanges(false);
        } else {
          const loadedProfile = await getAICardProfile();
          setForm(loadedProfile);
          serverProfileRef.current = loadedProfile;
          setHasUnsavedChanges(false);
        }
      } catch (error) {
        console.error('Failed to load AI Card profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [isDemoMode]);

  useEffect(() => {
    if (form.language) {
      void setPreferredLanguage(form.language, { persist: false });
    }
  }, [form.language]);

  const schedule = (fn: () => void) => {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(fn);
    } else {
      setTimeout(fn, 0);
    }
  };

  const ensureFocus = (element?: EditableElement, value?: string | null) => {
    if (!element) return;
    const elementId = element.id;
    const resolvedValue = value ?? '';
    schedule(() => {
      const target = (elementId ? document.getElementById(elementId) : element) as EditableElement | null;
      if (!target || document.activeElement === target || !target.isConnected) {
        return;
      }
      target.focus();
      if (typeof target.setSelectionRange === 'function') {
        try {
          const caret = resolvedValue.length;
          if (!(target instanceof HTMLInputElement && target.type === 'color')) {
            target.setSelectionRange(caret, caret);
          }
        } catch (error) {
          console.warn('[AI Card] unable to set selection range', error);
        }
      }
    });
  };

  const handleInputChange = <Key extends keyof AgentProfile>(
    field: Key,
    value: AgentProfile[Key],
    element?: EditableElement
  ) => {
    console.log('[AI Card] handleInputChange', field, value)
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
    setHasUnsavedChanges(true);
    const stringValue = typeof value === 'string' ? value : value == null ? '' : String(value);
    ensureFocus(element, stringValue);
    if (serverProfileRef.current) {
      serverProfileRef.current = {
        ...serverProfileRef.current,
        [field]: value as AgentProfile[Key]
      };
    }
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const el = document.activeElement as HTMLElement | null
      console.log('[AI Card] state phone now', form.phone, 'activeElement', el?.id, el?.tagName)
    } else {
      console.log('[AI Card] state phone now', form.phone, 'activeElement n/a')
    }
  }, [form.phone]);

  const handleManualSave = useCallback(async () => {
    if (!hasUnsavedChanges) return;
    await persistForm();
  }, [hasUnsavedChanges, persistForm]);

  const handleSocialMediaChange = (
    platform: keyof AgentProfile['socialMedia'],
    value: string,
    element?: EditableElement
  ) => {
    const updatedSocialMedia: AgentProfile['socialMedia'] = {
      ...form.socialMedia,
      [platform]: value
    };

    setForm(prev => ({
      ...prev,
      socialMedia: updatedSocialMedia
    }));
    setHasUnsavedChanges(true);
    ensureFocus(element, value);
  };

  const handleImageUpload = async (type: 'headshot' | 'logo', event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      setForm(prev => ({
        ...prev,
        [type]: serverProfileRef.current?.[type] ?? prev[type] ?? null
      }))
      return
    }

    let uploadSucceeded = false
    let uploadedValue: string | null = null
    try {
      const uploadResult = await uploadAiCardAsset(type, file)
      uploadedValue = uploadResult.path
      await persistForm({ [type]: uploadedValue })
      uploadSucceeded = true
    } catch (error) {
      console.error('Failed to upload image:', error)
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('User authentication required')) {
        try {
          const dataUrl = await fileToDataUrl(file)
          uploadedValue = dataUrl
          await persistForm({ [type]: dataUrl })
          uploadSucceeded = true
        } catch (fallbackError) {
          console.error('Failed to persist image fallback:', fallbackError)
        }
      }

      if (!uploadSucceeded) {
        setForm(prev => ({
          ...prev,
          [type]: serverProfileRef.current?.[type] ?? prev[type] ?? null
        }))
        setHasUnsavedChanges(true)
        if (serverProfileRef.current) {
          serverProfileRef.current = {
            ...serverProfileRef.current,
            [type]: serverProfileRef.current?.[type] ?? null
          }
        }
      }
    } finally {
      if (event.target) {
        event.target.value = ''
      }
    }
  }

  const handleRemoveAsset = async (type: 'headshot' | 'logo') => {
    setForm(prev => ({
      ...prev,
      [type]: null
    }))
    setHasUnsavedChanges(true)
    if (serverProfileRef.current) {
      serverProfileRef.current = {
        ...serverProfileRef.current,
        [type]: null
      }
    }

    try {
      const savedProfile = await persistForm({ [type]: null })
      if (serverProfileRef.current && savedProfile) {
        serverProfileRef.current = {
          ...serverProfileRef.current,
          [type]: savedProfile[type]
        }
      }
    } catch (error) {
      console.error('Failed to remove asset:', error)
    }
  }

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleGenerateQRCode = async () => {
    try {
      setIsLoading(true);
      const qrData = await generateQRCode(form.id);

      // Download the QR code
      const link = document.createElement('a');
      link.href = qrData.qrCode;
      link.download = `ai - card - qr - ${form.fullName.replace(/\s+/g, '-').toLowerCase()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log('✅ QR Code generated and downloaded');
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadCard = async () => {
    try {
      setIsLoading(true);
      await downloadAICard('ai-card-preview', `${form.fullName.replace(/\s+/g, '-').toLowerCase()} -ai - card.png`);
      console.log('✅ AI Card downloaded');
    } catch (error) {
      console.error('Failed to download AI Card:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle sharing
  const handleShare = async (method: string) => {
    try {
      setIsLoading(true);

      // Resolve real ID if possible to avoid 'default'
      let shareId = form.id;
      if (!isDemoMode) {
        const { data } = await supabase.auth.getUser();
        if (data?.user?.id) shareId = data.user.id;
      }

      const shareData = await shareAICard(method, shareId);

      if (method === 'copy') {
        setShareUrl(shareData.url);
        setShowShareModal(true);
        try {
          await navigator.clipboard.writeText(shareData.url);
          console.log('✅ AI Card URL copied to clipboard');
        } catch (clipboardError) {
          console.warn('Clipboard write failed (expected in non-secure context):', clipboardError);
          // Fallback handled by user seeing the modal and copying manually
        }
      } else {
        console.log(`✅ AI Card shared via ${method} `);
        alert(`AI Card shared successfully via ${method} !`);
      }
    } catch (error) {
      console.error('Failed to share AI Card:', error);

      // Fallback for copy method if backend logging fails
      if (method === 'copy') {
        try {
          await navigator.clipboard.writeText(shareUrl || window.location.href);
          setShareUrl(shareUrl || window.location.href);
          setShowShareModal(true);
          return;
        } catch (fallbackError) {
          alert('Failed to copy link. Please copy the URL from your browser address bar.');
          return;
        }
      }

      alert('Failed to share AI Card. Please try again or copy the link manually.');
    } finally {
      setIsLoading(false);
    }
  };

  const CollapsibleSection: React.FC<{
    title: string;
    sectionKey: string;
    children: React.ReactNode;
  }> = ({ title, sectionKey, children }) => {
    const isCollapsed = collapsedSections[sectionKey];

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center justify-between p-4 md:p-6 text-left hover:bg-gray-50 transition-colors"
        >
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {isCollapsed ? (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          )}
        </button>
        {!isCollapsed && (
          <div className="px-4 pb-4 md:px-6 md:pb-6 border-t border-gray-100">
            {children}
          </div>
        )}
      </div>
    );
  };

  const AICardPreview: React.FC<{ onChatClick?: () => void }> = ({ onChatClick }) => (
    <div className="relative">
      {/* AI Card Container */}
      <div
        id="ai-card-preview"
        className="relative bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-2xl overflow-hidden border border-gray-200"
        style={{
          width: '400px',
          height: '850px',
          background: `linear - gradient(135deg, ${form.brandColor}10 0 %, white 50 %, ${form.brandColor}05 100 %)`
        }}
      >
        {/* Header with brand color accent */}
        <div
          className="h-3 w-full"
          style={{ backgroundColor: form.brandColor }}
        />

        {/* Main Content */}
        <div className="p-8 h-full flex flex-col">
          {/* Logo Section */}
          {form.logo && (
            <div className="flex justify-center mb-6">
              <img
                src={form.logo}
                alt="Company Logo"
                className="h-12 w-auto object-contain"
              />
            </div>
          )}

          {/* Agent Photo & Info */}
          <div className="flex flex-col items-center text-center mb-8">
            {/* Headshot */}
            <div className="relative mb-4">
              {form.headshot ? (
                <img
                  src={form.headshot}
                  alt={form.fullName}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                  style={{ borderColor: form.brandColor }}
                />
              ) : (
                <div
                  className="w-24 h-24 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-2xl font-bold text-white"
                  style={{ backgroundColor: form.brandColor }}
                >
                  {form.fullName.split(' ').map(n => n[0]).join('')}
                </div>
              )}
            </div>

            {/* Name & Title */}
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{form.fullName}</h2>
            <p className="text-lg text-gray-600 mb-1">{form.professionalTitle}</p>
            <p className="text-base font-medium" style={{ color: form.brandColor }}>
              {form.company}
            </p>
          </div>

          {/* Contact Info */}
          <div className="space-y-3 mb-8">
            <div className="flex items-center justify-center space-x-2 text-gray-700">
              <Phone className="w-4 h-4" style={{ color: form.brandColor }} />
              <span className="text-sm">{form.phone}</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-gray-700">
              <Mail className="w-4 h-4" style={{ color: form.brandColor }} />
              <span className="text-sm">{form.email}</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-gray-700">
              <Globe className="w-4 h-4" style={{ color: form.brandColor }} />
              <span className="text-sm">{form.website}</span>
            </div>
          </div>

          {/* Bio */}
          <div className="mb-6 flex-1">
            <p className="text-sm text-gray-600 leading-relaxed line-clamp-4">
              {form.bio}
            </p>
          </div>

          {/* How Can I Help Button */}
          <div className="mb-8">
            <button
              onClick={onChatClick}
              className="w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-300 hover:scale-105 shadow-lg text-base"
              style={{ backgroundColor: form.brandColor }}
            >
              How can I help?
            </button>
          </div>

          {/* Social Media Icons */}
          <div className="flex justify-center space-x-4 mb-6">
            {form.socialMedia.facebook && (
              <Facebook className="w-5 h-5 text-blue-600 hover:scale-110 transition-transform cursor-pointer" />
            )}
            {form.socialMedia.instagram && (
              <Instagram className="w-5 h-5 text-pink-500 hover:scale-110 transition-transform cursor-pointer" />
            )}
            {form.socialMedia.twitter && (
              <Twitter className="w-5 h-5 text-blue-400 hover:scale-110 transition-transform cursor-pointer" />
            )}
            {form.socialMedia.linkedin && (
              <Linkedin className="w-5 h-5 text-blue-700 hover:scale-110 transition-transform cursor-pointer" />
            )}
            {form.socialMedia.youtube && (
              <Youtube className="w-5 h-5 text-red-600 hover:scale-110 transition-transform cursor-pointer" />
            )}
          </div>

          {/* Share Button */}
          <div className="flex justify-center">
            <button
              onClick={() => handleShare('copy')}
              disabled={isLoading}
              className="flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50"
              style={{
                backgroundColor: form.brandColor,
                color: 'white',
                marginBottom: '50px'
              }}
            >
              <Share2 className="w-5 h-5" />
              <span>{isLoading ? 'Sharing...' : 'Share Card'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          {/* Title Section */}
          <div className="text-center lg:text-left">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">AI Business Card {isDemoMode && <span className="text-sm font-normal text-blue-600">(Demo)</span>}</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              {isDemoMode ? 'Explore the AI Business Card features - changes won\'t be saved' : 'Create your interactive AI-powered business card'}
              {isSaving && <span className="text-blue-600 ml-2">• Saving...</span>}
              {isLoading && <span className="text-blue-600 ml-2">• Loading...</span>}
            </p>
          </div>

          {/* Controls Section */}
          <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
            {/* Tab Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1 mx-auto sm:mx-0">
              <button
                onClick={() => setActiveTab('edit')}
                className={`flex items - center justify - center space - x - 1 sm: space - x - 2 px - 2 sm: px - 4 py - 2 rounded - md text - xs sm: text - sm font - medium transition - colors flex - 1 sm: flex - none ${activeTab === 'edit'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                  } `}
              >
                <Palette className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex items - center justify - center space - x - 1 sm: space - x - 2 px - 2 sm: px - 4 py - 2 rounded - md text - xs sm: text - sm font - medium transition - colors flex - 1 sm: flex - none ${activeTab === 'preview'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                  } `}
              >
                <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Preview</span>
              </button>
              <button
                onClick={() => setActiveTab('qr-codes')}
                className={`flex items - center justify - center space - x - 1 sm: space - x - 2 px - 2 sm: px - 4 py - 2 rounded - md text - xs sm: text - sm font - medium transition - colors flex - 1 sm: flex - none ${activeTab === 'qr-codes'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                  } `}
              >
                <QrCode className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>QR Codes</span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2 sm:space-x-3">
              <button
                onClick={handleManualSave}
                disabled={isSaving || !hasUnsavedChanges}
                className="flex items-center justify-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-xs sm:text-sm font-medium flex-1 sm:flex-none disabled:opacity-50"
              >
                <span>{isSaving ? 'Saving…' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}</span>
              </button>

              <button
                onClick={handleGenerateQRCode}
                disabled={isLoading}
                className="flex items-center justify-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm font-medium flex-1 sm:flex-none disabled:opacity-50"
              >
                <QrCode className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">{isLoading ? 'Generating...' : 'Generate QR'}</span>
                <span className="xs:hidden">QR</span>
              </button>

              <button
                onClick={handleDownloadCard}
                disabled={isLoading}
                className="flex items-center justify-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs sm:text-sm font-medium flex-1 sm:flex-none disabled:opacity-50"
              >
                <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">{isLoading ? 'Downloading...' : 'Download'}</span>
                <span className="xs:hidden">Save</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Help / Pro Tips */}
      <div className="p-4 sm:p-6">
        <div className="max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setIsHelpPanelOpen(prev => !prev)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-50 text-primary-700 font-semibold border border-primary-100 hover:bg-primary-100 transition-colors"
              aria-expanded={isHelpPanelOpen}
            >
              <span className="material-symbols-outlined text-xl">{isHelpPanelOpen ? 'psychiatry' : 'help'}</span>
              {isHelpPanelOpen ? 'Hide AI Card Tips' : 'Show AI Card Tips'}
              <span className="material-symbols-outlined text-base ml-auto">{isHelpPanelOpen ? 'expand_less' : 'expand_more'}</span>
            </button>
            {isDemoMode && (
              <div className={`flex items - center gap - 1.5 px - 3 py - 1.5 rounded - lg text - xs font - medium transition - all ${showDemoNotice
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-blue-50 text-blue-700 border border-blue-100'
                } `}>
                <span className="material-symbols-outlined text-sm">info</span>
                <span>Demo Mode: Changes not saved</span>
              </div>
            )}
          </div>
          {isHelpPanelOpen && (
            <div className="mt-4 bg-white border border-primary-100 rounded-xl shadow-sm p-5 text-sm text-slate-600 space-y-4">
              <div>
                <h2 className="text-base font-semibold text-primary-700 flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-lg">badge</span>
                  Build a High-Converting AI Card
                </h2>
                <ul className="space-y-1.5 list-disc list-inside">
                  <li><strong>Brand consistency:</strong> Upload your headshot, logo, and pick a brand color so the card mirrors your print and web collateral.</li>
                  <li><strong>Bio & social links:</strong> Keep the story tight (2–3 sentences) and make sure social URLs point to active accounts clients can browse.</li>
                  <li><strong>AI assistant chat:</strong> Use the preview chat to confirm the AI introduces you correctly and handles common questions smoothly.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-base font-semibold text-primary-700 flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-lg">qr_code_2</span>
                  QR Code Marketing
                </h2>
                <ul className="space-y-1.5 list-disc list-inside">
                  <li><strong>Print placements:</strong> Add QR codes to flyers, signage, business cards, and listing packets so leads can reach your AI card instantly.</li>
                  <li><strong>Track engagement:</strong> Generate unique codes per campaign (open house, mailer, social) and monitor scans inside the QR dashboard.</li>
                  <li><strong>Landing experience:</strong> Make sure the AI card contact buttons (call, text, chat) are enabled before distributing the code.</li>
                </ul>
                <p className="mt-3 text-sm text-slate-500">
                  <strong>Pro tip:</strong> Pair the AI card QR with a “Talk to my AI concierge” CTA—buyers love the novelty and you capture more late-night inquiries.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 sm:p-6">
        {activeTab === 'edit' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Left Side - Form */}
            <div className="space-y-6 lg:space-y-8">
              {/* Basic Information */}
              <CollapsibleSection title="👤 Basic Information" sectionKey="basic">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="ai-card-full-name" className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name*
                    </label>
                    <input
                      id="ai-card-full-name"
                      type="text"
                      value={form.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value, e.target)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="ai-card-professional-title" className="block text-sm font-medium text-gray-700 mb-2">
                      Professional Title*
                    </label>
                    <input
                      id="ai-card-professional-title"
                      type="text"
                      value={form.professionalTitle}
                      onChange={(e) => handleInputChange('professionalTitle', e.target.value, e.target)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="ai-card-company" className="block text-sm font-medium text-gray-700 mb-2">
                      Company*
                    </label>
                    <input
                      id="ai-card-company"
                      type="text"
                      value={form.company}
                      onChange={(e) => handleInputChange('company', e.target.value, e.target)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Brand Color
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        id="ai-card-brand-color-picker"
                        type="color"
                        value={form.brandColor}
                        onChange={(e) => handleInputChange('brandColor', e.target.value, e.target)}
                        className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                      />
                      <input
                        id="ai-card-brand-color"
                        type="text"
                        value={form.brandColor}
                        onChange={(e) => handleInputChange('brandColor', e.target.value, e.target)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                </div>
              </CollapsibleSection>

              {/* Contact Information */}
              <CollapsibleSection title="📞 Contact Information" sectionKey="contact">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="ai-card-phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number*
                    </label>
                    <input
                      id="ai-card-phone"
                      type="tel"
                      value={form.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value, e.target)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="ai-card-email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address*
                    </label>
                    <input
                      id="ai-card-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => handleInputChange('email', e.target.value, e.target)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="ai-card-website" className="block text-sm font-medium text-gray-700 mb-2">
                      Website URL
                    </label>
                    <input
                      id="ai-card-website"
                      type="url"
                      value={form.website}
                      onChange={(e) => handleInputChange('website', e.target.value, e.target)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </CollapsibleSection>

              {/* Images */}
              <CollapsibleSection title="🖼️ Images" sectionKey="images">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Headshot */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Professional Headshot
                    </label>
                    <div
                      onClick={() => headshotInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors"
                    >
                      {form.headshot ? (
                        <img
                          src={form.headshot}
                          alt="Headshot"
                          className="w-24 h-24 rounded-full mx-auto object-cover mb-2"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-gray-200 mx-auto mb-2 flex items-center justify-center">
                          <Upload className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      <p className="text-sm text-gray-600">Click to upload headshot</p>
                    </div>
                    {form.headshot && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleRemoveAsset('headshot');
                        }}
                        className="mt-2 text-xs font-medium text-red-600 hover:text-red-700"
                      >
                        Remove headshot
                      </button>
                    )}
                    <input
                      ref={headshotInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload('headshot', e)}
                      className="hidden"
                    />
                  </div>

                  {/* Logo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Logo
                    </label>
                    <div
                      onClick={() => logoInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors"
                    >
                      {form.logo ? (
                        <img
                          src={form.logo}
                          alt="Logo"
                          className="w-24 h-16 mx-auto object-contain mb-2"
                        />
                      ) : (
                        <div className="w-24 h-16 bg-gray-200 mx-auto mb-2 flex items-center justify-center rounded">
                          <Upload className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      <p className="text-sm text-gray-600">Click to upload logo</p>
                    </div>
                    {form.logo && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleRemoveAsset('logo');
                        }}
                        className="mt-2 text-xs font-medium text-red-600 hover:text-red-700"
                      >
                        Remove logo
                      </button>
                    )}
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload('logo', e)}
                      className="hidden"
                    />
                  </div>
                </div>
              </CollapsibleSection>

              {/* Professional Bio */}
              <CollapsibleSection title="📝 Professional Bio" sectionKey="bio">
                <label htmlFor="ai-card-bio" className="block text-sm font-medium text-gray-700 mb-2">
                  Professional Bio
                </label>
                <textarea
                  id="ai-card-bio"
                  value={form.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value, e.target)}
                  rows={6}
                  placeholder="Tell visitors about your experience and expertise..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <p className="text-sm text-gray-500 mt-2">
                  {form.bio.length}/500 characters
                </p>
              </CollapsibleSection>

              {/* Social Media Links */}
              <CollapsibleSection title="🔗 Social Media Links" sectionKey="social">

                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Facebook className="w-5 h-5 text-blue-600" />
                    <input
                      type="url"
                      placeholder="https://facebook.com/username"
                      value={form.socialMedia.facebook}
                      onChange={(e) => handleSocialMediaChange('facebook', e.target.value, e.target)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center space-x-3">
                    <Instagram className="w-5 h-5 text-pink-500" />
                    <input
                      type="url"
                      placeholder="https://instagram.com/username"
                      value={form.socialMedia.instagram}
                      onChange={(e) => handleSocialMediaChange('instagram', e.target.value, e.target)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center space-x-3">
                    <Twitter className="w-5 h-5 text-blue-400" />
                    <input
                      type="url"
                      placeholder="https://twitter.com/username"
                      value={form.socialMedia.twitter}
                      onChange={(e) => handleSocialMediaChange('twitter', e.target.value, e.target)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center space-x-3">
                    <Linkedin className="w-5 h-5 text-blue-700" />
                    <input
                      type="url"
                      placeholder="https://linkedin.com/in/username"
                      value={form.socialMedia.linkedin}
                      onChange={(e) => handleSocialMediaChange('linkedin', e.target.value, e.target)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center space-x-3">
                    <Youtube className="w-5 h-5 text-red-600" />
                    <input
                      type="url"
                      placeholder="https://youtube.com/@username"
                      value={form.socialMedia.youtube}
                      onChange={(e) => handleSocialMediaChange('youtube', e.target.value, e.target)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </CollapsibleSection>
            </div>

            {/* Right Side - Live Preview */}
            <div className="lg:sticky lg:top-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6 text-center">
                  ✨ Live Preview
                </h2>
                <div className="flex justify-center">
                  <div className="transform scale-75 sm:scale-90 lg:scale-100 origin-top">
                    <AICardPreview onChatClick={() => setIsChatOpen(true)} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'preview' ? (
          // Full Screen Preview
          <div className="flex justify-center items-center min-h-full">
            <AICardPreview onChatClick={() => setIsChatOpen(true)} />
          </div>
        ) : (
          // QR Codes Management
          <QRCodeManagementPage isDemoMode={isDemoMode} />
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-fade-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Card URL Copied!</h3>
              <p className="text-gray-600">Share this link to showcase your AI business card</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 bg-transparent text-sm text-gray-700 outline-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                  }}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                onClick={() => window.open(`sms:? body = ${encodeURIComponent(shareUrl)} `, '_blank')}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Mail className="w-5 h-5 text-gray-700" />
                <span className="text-sm font-medium text-gray-700">Text</span>
              </button>
              <button
                onClick={() => window.open(`mailto:? body = ${encodeURIComponent(shareUrl)} `, '_blank')}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Mail className="w-5 h-5 text-gray-700" />
                <span className="text-sm font-medium text-gray-700">Email</span>
              </button>
            </div>

            <button
              onClick={() => setShowShareModal(false)}
              className="w-full py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Chat Bot Integration */}
      <ChatBotFAB
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(prev => !prev)}
        initialMode="agent"
        context={{
          userType: 'prospect',
          userInfo: {
            name: 'Visitor'
          },
          currentPage: 'AI Card Preview',
          agentProfile: {
            name: form.fullName,
            title: form.professionalTitle,
            company: form.company,
            bio: form.bio,
            tone: 'Professional and helpful'
          }
        }}
        showWelcomeMessage={false}
      />
    </div>
  );
};

export default AICardPage;
