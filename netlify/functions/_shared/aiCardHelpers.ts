import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface AiCardProfile {
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

export interface AiCardQrCode {
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

const FALLBACK_SUPABASE_URL = 'https://yocchddxdsaldgsibmmc.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvY2NoZGR4ZHNhbGRnc2libW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1ODEwNDgsImV4cCI6MjA3MjE1NzA0OH0.02jE3WPLnb-DDexNqSnfIPfmPZldsby1dPOu5-BlSDw';

const SUPABASE_URL = process.env.SUPABASE_URL || FALLBACK_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

export const DEFAULT_LEAD_USER_ID =
  process.env.DEFAULT_LEAD_USER_ID || '75114b93-e1c8-4d54-9e43-dd557d9e3ad9';

export const supabaseAdmin: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
    : null;

const DATA_URL_IMAGE_REGEX = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/i;

export const DEFAULT_AI_CARD_PROFILE: AiCardProfile = {
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
  socialMedia: {
    facebook: '',
    instagram: '',
    twitter: '',
    linkedin: '',
    youtube: ''
  },
  headshot: null,
  logo: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const useLocalStore = !supabaseAdmin;

interface AiCardProfileRow {
  id: string;
  user_id?: string;
  full_name?: string | null;
  professional_title?: string | null;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  bio?: string | null;
  brand_color?: string | null;
  language?: string | null;
  social_media?: AiCardProfile['socialMedia'] | null;
  headshot_url?: string | null;
  logo_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

const localProfileStore = new Map<string, AiCardProfileRow>();

const normalizeUserId = (userId?: string | null) =>
  userId ? userId.trim().toLowerCase() : 'default';

const isDataUrl = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith('data:');

const cloneSocialMedia = (value?: AiCardProfile['socialMedia']) => ({
  facebook: value?.facebook || '',
  instagram: value?.instagram || '',
  twitter: value?.twitter || '',
  linkedin: value?.linkedin || '',
  youtube: value?.youtube || ''
});

export const mapAiCardProfileFromRow = (row: AiCardProfileRow | null | undefined): AiCardProfile | null =>
  !row
    ? null
    : {
        id: row.id,
        fullName: row.full_name || '',
        professionalTitle: row.professional_title || DEFAULT_AI_CARD_PROFILE.professionalTitle,
        company: row.company || '',
        phone: row.phone || '',
        email: row.email || '',
        website: row.website || '',
        bio: row.bio || '',
        brandColor: row.brand_color || DEFAULT_AI_CARD_PROFILE.brandColor,
        language: row.language || DEFAULT_AI_CARD_PROFILE.language,
        socialMedia: row.social_media || cloneSocialMedia(),
        headshot: row.headshot_url || null,
        logo: row.logo_url || null,
        created_at: row.created_at,
        updated_at: row.updated_at
      };

const mapAiCardProfileToRow = (profileData: Partial<AiCardProfile> = {}) => {
  const payload: Record<string, unknown> = {};
  if (profileData.fullName !== undefined) payload.full_name = profileData.fullName;
  if (profileData.professionalTitle !== undefined)
    payload.professional_title = profileData.professionalTitle;
  if (profileData.company !== undefined) payload.company = profileData.company;
  if (profileData.phone !== undefined) payload.phone = profileData.phone;
  if (profileData.email !== undefined) payload.email = profileData.email;
  if (profileData.website !== undefined) payload.website = profileData.website;
  if (profileData.bio !== undefined) payload.bio = profileData.bio;
  if (profileData.brandColor !== undefined) payload.brand_color = profileData.brandColor;
  if (profileData.language !== undefined) payload.language = profileData.language;
  if (profileData.socialMedia !== undefined) payload.social_media = profileData.socialMedia;

  const processAssetField = (key: 'headshot' | 'logo', column: 'headshot_url' | 'logo_url') => {
    if (profileData[key] === undefined) return;
    const value = profileData[key];
    if (value === null || value === '') {
      payload[column] = null;
      return;
    }
    if (typeof value === 'string') {
      payload[column] = value;
    }
  };

  processAssetField('headshot', 'headshot_url');
  processAssetField('logo', 'logo_url');
  return payload;
};

const uploadDataUrlToStorage = async (
  userId: string,
  type: 'headshot' | 'logo',
  dataUrl: string,
  mimeTypeHint?: string
) => {
  if (!supabaseAdmin) {
    return dataUrl;
  }

  const match = DATA_URL_IMAGE_REGEX.exec(dataUrl || '');
  if (!match) {
    throw new Error('Invalid data URL provided');
  }

  const mimeType = mimeTypeHint || match[1] || 'image/jpeg';
  const base64Data = match[2];
  const buffer = Buffer.from(base64Data, 'base64');
  const extension = mimeType.split('/')[1] || 'jpg';
  const sanitizedExt = extension.replace(/[^a-z0-9]/gi, '') || 'jpg';
  const assetPath = `${userId}/${type}-${Date.now()}.${sanitizedExt}`;

  const { error } = await supabaseAdmin.storage.from('ai-card-assets').upload(assetPath, buffer, {
    contentType: mimeType,
    upsert: true
  });

  if (error) {
    throw error;
  }

  return assetPath;
};

const normalizeAiCardProfileAssets = async (userId: string, profileData: Partial<AiCardProfile>) => {
  const normalized = { ...profileData };
  if (useLocalStore) {
    return normalized;
  }

  const processAsset = async (key: 'headshot' | 'logo') => {
    const value = normalized[key];
    if (!value || typeof value !== 'string') return;
    if (!isDataUrl(value)) return;
    const hintKey = `${key}MimeType` as 'headshotMimeType' | 'logoMimeType';
    try {
      const storedPath = await uploadDataUrlToStorage(
        userId,
        key,
        value,
        normalized[hintKey] as string | undefined
      );
      normalized[key] = storedPath as string;
      delete normalized[hintKey];
    } catch (error) {
      console.error(`[AI Card] Failed to persist ${key} asset for ${userId}:`, error);
      delete normalized[hintKey];
    }
  };

  await processAsset('headshot');
  await processAsset('logo');
  return normalized;
};

export const fetchAiCardProfileForUser = async (userId?: string | null) => {
  if (!userId) return null;
  if (useLocalStore) {
    const cached = localProfileStore.get(normalizeUserId(userId));
    return cached || null;
  }

  try {
    const { data, error } = await supabaseAdmin!
      .from('ai_card_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.warn('[AI Card] Failed to load profile from Supabase:', error.message || error);
      return null;
    }

    if (!data) {
      return null;
    }
    return mapAiCardProfileFromRow(data);
  } catch (error) {
    console.warn('[AI Card] Supabase profile lookup error:', (error as Error)?.message || error);
    return null;
  }
};

export const upsertAiCardProfileForUser = async (
  userId: string,
  profileData: Partial<AiCardProfile>,
  { mergeDefaults = false }: { mergeDefaults?: boolean } = {}
) => {
  if (!userId) {
    throw new Error('userId is required for AI Card profile operations');
  }

  const baseData = mergeDefaults ? { ...DEFAULT_AI_CARD_PROFILE, ...profileData } : profileData || {};
  const sourceData = await normalizeAiCardProfileAssets(userId, baseData);
  const payload = {
    user_id: userId,
    ...mapAiCardProfileToRow(sourceData),
    updated_at: new Date().toISOString()
  };

  if (useLocalStore) {
    const key = normalizeUserId(userId);
    const existing = localProfileStore.get(key);
    const row: AiCardProfileRow = {
      ...(existing || {}),
      ...payload,
      id: existing?.id || userId,
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    localProfileStore.set(key, row);
    return mapAiCardProfileFromRow(row);
  }

  const { data, error } = await supabaseAdmin!
    .from('ai_card_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return mapAiCardProfileFromRow(data);
};

interface AiCardQrCodeRow {
  id: string;
  user_id: string;
  label: string;
  destination_url: string;
  qr_svg: string;
  total_scans?: number | null;
  last_scanned_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const mapAiCardQrCodeFromRow = (row: AiCardQrCodeRow | null | undefined): AiCardQrCode | null =>
  !row
    ? null
    : {
        id: row.id,
        userId: row.user_id,
        label: row.label,
        destinationUrl: row.destination_url,
        qrSvg: row.qr_svg,
        totalScans: row.total_scans || 0,
        lastScannedAt: row.last_scanned_at,
        created_at: row.created_at,
        updated_at: row.updated_at
      };

export const buildAiCardDestinationUrl = (
  profile: AiCardProfile | null | undefined,
  userId?: string | null,
  explicitUrl?: string | null
) => explicitUrl || `https://homelistingai.com/card/${profile?.id || userId || 'default'}`;

export const buildQrSvgDataUrl = (displayName?: string | null, destinationUrl?: string | null) => {
  const name =
    displayName && displayName.trim().length > 0 ? displayName.trim() : 'Your Agent';
  const url = destinationUrl || 'https://homelistingai.com';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="white"/>
      <text x="100" y="100" text-anchor="middle" font-family="Arial" font-size="12" fill="black">
        QR Code for ${name}
      </text>
      <text x="100" y="120" text-anchor="middle" font-family="Arial" font-size="8" fill="gray">
        ${url}
      </text>
    </svg>
  `;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
};
