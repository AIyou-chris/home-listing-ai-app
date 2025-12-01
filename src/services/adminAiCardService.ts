import { supabase } from './supabase';
import { AuthService } from './authService';

const auth = AuthService.getInstance();

export type AdminAICardProfile = {
  id: string;
  adminUserId: string | null;
  fullName: string;
  title: string;
  tagline: string;
  specialties: string;
  phone: string;
  email: string;
  website: string;
  ctaLabel: string;
  ctaUrl: string;
  bio: string;
  brandColor: string;
  headshot: string | null;
  chatEnabled: boolean;
  created_at?: string;
  updated_at?: string;
};

export type AdminAICardShareResponse = {
  url: string;
  method: string;
  recipient?: string;
};

const resolveAdminUserId = async () => {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id ?? null;
  } catch (error) {
    console.warn('[admin-ai-card] unable to resolve admin user id', error);
    return null;
  }
};

const ensureOk = async (response: Response, context: string) => {
  if (!response.ok) {
    const msg = await response.text().catch(() => response.statusText);
    throw new Error(`${context} failed (${response.status}): ${msg}`);
  }
};

export const buildAdminCardUrl = (cardId?: string | null) => {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/admin/ai-card/${cardId ?? 'preview'}`;
};

export const getAdminAICardProfile = async (): Promise<AdminAICardProfile> => {
  const adminUserId = await resolveAdminUserId();
  const response = await auth.makeAuthenticatedRequest('/api/admin/ai-card/profile', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
  await ensureOk(response, 'Load admin AI Card');
  const profile = (await response.json()) as AdminAICardProfile | null;
  return (
    profile ?? {
      id: adminUserId ?? 'admin-card',
      adminUserId,
      fullName: '',
      title: '',
      tagline: '',
      specialties: '',
      phone: '',
      email: '',
      website: '',
      ctaLabel: 'Book a Call',
      ctaUrl: '',
      bio: '',
      brandColor: '#0ea5e9',
      headshot: null,
      chatEnabled: false
    }
  );
};

export const upsertAdminAICardProfile = async (payload: Partial<AdminAICardProfile>): Promise<AdminAICardProfile> => {
  const adminUserId = await resolveAdminUserId();
  const response = await auth.makeAuthenticatedRequest('/api/admin/ai-card/profile', {
    method: 'PUT',
    body: JSON.stringify({ ...payload, adminUserId })
  });
  await ensureOk(response, 'Save admin AI Card');
  return (await response.json()) as AdminAICardProfile;
};

export const uploadAdminAICardAsset = async (
  file: File,
  kind: 'headshot' | 'logo' = 'headshot'
): Promise<{ path: string; url: string | null }> => {
  const adminUserId = await resolveAdminUserId();
  if (!adminUserId) throw new Error('Admin authentication required for uploads.');
  const ext = file.name?.split('.').pop()?.toLowerCase() || 'png';
  const sanitized = ext.replace(/[^a-z0-9]/gi, '') || 'png';
  const path = `${adminUserId}/${kind}-${Date.now()}.${sanitized}`;
  const { error } = await supabase.storage
    .from('admin-ai-card-assets')
    .upload(path, file, { contentType: file.type || 'image/png', upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('admin-ai-card-assets').getPublicUrl(path);
  return { path, url: data?.publicUrl ?? null };
};

export const generateAdminAICardQr = async (cardUrl: string) => {
  const adminUserId = await resolveAdminUserId();
  const response = await auth.makeAuthenticatedRequest('/api/admin/ai-card/generate-qr', {
    method: 'POST',
    body: JSON.stringify({ adminUserId, cardUrl })
  });
  await ensureOk(response, 'Generate admin AI Card QR');
  return (await response.json()) as { qrCode: string; url: string };
};

export const shareAdminAICard = async (method: string, recipient?: string): Promise<AdminAICardShareResponse> => {
  const adminUserId = await resolveAdminUserId();
  const response = await auth.makeAuthenticatedRequest('/api/admin/ai-card/share', {
    method: 'POST',
    body: JSON.stringify({ adminUserId, method, recipient })
  });
  await ensureOk(response, 'Share admin AI Card');
  return (await response.json()) as AdminAICardShareResponse;
};

export type { AdminAICardProfile };
