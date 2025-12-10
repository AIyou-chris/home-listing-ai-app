import { supabase } from './supabase'

const getApiBase = () => {
  const base = import.meta.env.VITE_API_BASE_URL;
  if (!base || base.length < 10 || !base.startsWith('http')) {
    return 'https://home-listing-ai-backend.onrender.com';
  }
  return base.endsWith('/') ? base.slice(0, -1) : base;
};

interface AICardProfile {
  id: string;
  fullName: string;
  professionalTitle: string;
  company: string;
  phone: string;
  email: string;
  website: string;
  bio: string;
  brandColor: string;
  language: string;
  socialMedia: {
    facebook: string;
    instagram: string;
    twitter: string;
    linkedin: string;
    youtube: string;
  };
  headshot: string | null;
  logo: string | null;
  created_at?: string;
  updated_at?: string;
}

interface QRCodeResponse {
  qrCode: string;
  url: string;
  profileId: string;
}

interface ShareResponse {
  url: string;
  text: string;
  method: string;
  recipient?: string;
  timestamp: string;
}

export interface AICardQRCode {
  id: string;
  userId: string;
  label: string;
  destinationUrl: string;
  qrSvg: string;
  totalScans: number;
  lastScannedAt: string | null;
  created_at?: string;
  updated_at?: string;
}

const resolveUserId = async (explicit?: string | null) => {
  if (explicit) return explicit;
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || null;
  } catch (error) {
    console.warn('[AI Card] Failed to resolve user id:', error);
    return null;
  }
};

const createSignedAssetUrl = async (path?: string | null) => {
  if (!path) return null;
  // Since the bucket is public, we use public URLs directly.
  // This avoids RLS issues with signing URLs for anonymous/demo users.
  const { data } = supabase.storage.from('ai-card-assets').getPublicUrl(path);
  return data?.publicUrl || null;
};

const withAssetUrls = async (profile: AICardProfile): Promise<AICardProfile> => {
  const enriched = { ...profile };
  if (enriched.headshot && !enriched.headshot.startsWith('data:') && !enriched.headshot.startsWith('http')) {
    enriched.headshot = (await createSignedAssetUrl(enriched.headshot)) || enriched.headshot;
  }
  if (enriched.logo && !enriched.logo.startsWith('data:') && !enriched.logo.startsWith('http')) {
    enriched.logo = (await createSignedAssetUrl(enriched.logo)) || enriched.logo;
  }
  enriched.language = enriched.language && enriched.language.trim().length > 0 ? enriched.language : 'en';
  return enriched;
};

export const uploadAiCardAsset = async (
  type: 'headshot' | 'logo',
  file: File,
  userId?: string
): Promise<{ path: string; url: string | null }> => {
  const resolvedUserId = await resolveUserId(userId);
  // Relaxed check: If no user ID, we might be in demo/fallback mode.
  // The backend will handle the fallback logic (or fail if strictly required).
  // We proceed to attempt upload. If direct storage upload fails due to RLS,
  // the component catches it and tries the backend fallback.

  if (!resolvedUserId) {
    console.warn('[AI Card] No authenticated user found for upload. Triggering fallback.');
    // Throwing this specific error message triggers the fallback logic in AICardPage.tsx
    throw new Error('User authentication required to upload AI Card assets.');
  }

  const extension = file.name?.split('.').pop()?.toLowerCase() || 'png';
  const sanitizedExt = extension.replace(/[^a-z0-9]/gi, '') || 'png';
  const path = `${resolvedUserId}/${type}-${Date.now()}.${sanitizedExt}`;

  const { error } = await supabase.storage
    .from('ai-card-assets')
    .upload(path, file, {
      contentType: file.type || 'image/png',
      upsert: true
    });

  if (error) {
    throw error;
  }

  const url = await createSignedAssetUrl(path);
  return { path, url };
};

// Get AI Card profile
export const getAICardProfile = async (userId?: string, signal?: AbortSignal): Promise<AICardProfile> => {
  try {
    const resolvedUserId = await resolveUserId(userId);
    const queryParams = resolvedUserId ? `?userId=${resolvedUserId}` : '';
    const response = await fetch(`${getApiBase()}/api/ai-card/profile${queryParams}`, {
      signal
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const profile = await withAssetUrls(await response.json());

    console.log('✅ Retrieved AI Card profile');
    return profile;
  } catch (error) {
    console.error('Error getting AI Card profile:', error);
    throw error;
  }
};

// Create new AI Card profile
export const createAICardProfile = async (profileData: Omit<AICardProfile, 'id' | 'created_at' | 'updated_at'>, userId?: string): Promise<AICardProfile> => {
  try {
    const resolvedUserId = await resolveUserId(userId);
    const response = await fetch(`${getApiBase()}/api/ai-card/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: resolvedUserId,
        ...profileData
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const profile = await withAssetUrls(await response.json());
    console.log('✅ Created AI Card profile');
    return profile;
  } catch (error) {
    console.error('Error creating AI Card profile:', error);
    throw error;
  }
};

// Update AI Card profile
export const updateAICardProfile = async (profileData: Partial<AICardProfile>, userId?: string): Promise<AICardProfile> => {
  try {
    const resolvedUserId = await resolveUserId(userId);
    const response = await fetch(`${getApiBase()}/api/ai-card/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: resolvedUserId,
        ...profileData
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const profile = await withAssetUrls(await response.json());
    console.log('✅ Updated AI Card profile');
    return profile;
  } catch (error) {
    console.error('Error updating AI Card profile:', error);
    throw error;
  }
};

// Generate QR Code for AI Card
export const generateQRCode = async (userId?: string, cardUrl?: string): Promise<QRCodeResponse> => {
  try {
    const resolvedUserId = await resolveUserId(userId);
    const response = await fetch(`${getApiBase()}/api/ai-card/generate-qr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: resolvedUserId,
        cardUrl
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const qrData = await response.json();
    console.log('✅ Generated QR code for AI Card');
    return qrData;
  } catch (error) {
    console.error('Error generating QR code:', error);
    const fallbackUrl = cardUrl
      ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(cardUrl)}`
      : 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=HomeListingAI%20QR';
    console.info('Using fallback QR service for AI Card', fallbackUrl);
    return {
      qrCode: fallbackUrl,
      url: cardUrl ?? '',
      profileId: userId ?? 'demo'
    };
  }
};

// Share AI Card
export const shareAICard = async (method: string, userId?: string, recipient?: string): Promise<ShareResponse> => {
  try {
    const resolvedUserId = await resolveUserId(userId);
    const response = await fetch(`${getApiBase()}/api/ai-card/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: resolvedUserId,
        method,
        recipient
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const shareData = await response.json();
    console.log('✅ Shared AI Card');
    return shareData;
  } catch (error) {
    console.error('Error sharing AI Card:', error);
    throw error;
  }
};

export const listAICardQRCodes = async (userId?: string): Promise<AICardQRCode[]> => {
  const resolvedUserId = await resolveUserId(userId);
  const queryParams = resolvedUserId ? `?userId=${resolvedUserId}` : '';
  const response = await fetch(`${getApiBase()}/api/ai-card/qr-codes${queryParams}`);
  if (!response.ok) {
    throw new Error(`Failed to load QR codes: ${response.status}`);
  }
  const data = (await response.json()) as AICardQRCode[];
  return data;
};

export const createAICardQRCode = async (
  label: string,
  destinationUrl?: string,
  userId?: string
): Promise<AICardQRCode> => {
  const resolvedUserId = await resolveUserId(userId);
  const response = await fetch(`${getApiBase()}/api/ai-card/qr-codes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: resolvedUserId,
      label,
      destinationUrl
    })
  });
  if (!response.ok) {
    throw new Error((await response.text()) || 'Failed to create QR code');
  }
  return (await response.json()) as AICardQRCode;
};

export const updateAICardQRCode = async (
  qrId: string,
  updates: { label?: string; destinationUrl?: string }
): Promise<AICardQRCode> => {
  const response = await fetch(`${getApiBase()}/api/ai-card/qr-codes/${qrId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  if (!response.ok) {
    throw new Error((await response.text()) || 'Failed to update QR code');
  }
  return (await response.json()) as AICardQRCode;
};

export const deleteAICardQRCode = async (qrId: string): Promise<void> => {
  const response = await fetch(`${getApiBase()}/api/ai-card/qr-codes/${qrId}`, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error((await response.text()) || 'Failed to delete QR code');
  }
};

// Download AI Card as image (using html2canvas)
export const downloadAICard = async (elementId: string, filename?: string): Promise<void> => {
  try {
    // Dynamic import to avoid bundling html2canvas if not needed
    const html2canvas = (await import('html2canvas')).default;

    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('AI Card element not found');
    }

    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2, // Higher quality
      useCORS: true,
      allowTaint: true
    });

    // Convert to blob and download
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || `ai-card-${new Date().toISOString().split('T')[0]}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('✅ Downloaded AI Card as image');
      }
    }, 'image/png');
  } catch (error) {
    console.error('Error downloading AI Card:', error);
    throw error;
  }
};

export type { AICardProfile, QRCodeResponse, ShareResponse };
