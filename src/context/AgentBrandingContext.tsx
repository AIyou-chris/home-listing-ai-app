import React, {
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react';
import {
  getAgentProfile,
  getAgentProfileSnapshot,
  getAICardProfileSnapshot,
  refreshAgentProfile,
  subscribeToProfileChanges,
  type AgentProfile as CentralAgentProfile,
  type AICardProfile
} from '../services/agentProfileService';
import { getAuthenticatedAgentData, type AgentData } from '../services/agentDataService';
import type { AgentProfile as UiAgentProfile } from '../types';
import { EMPTY_AGENT } from '../constants';
import { AgentBrandingContext } from './AgentBrandingContextInstance';

const DEFAULT_BRAND_COLOR = '#0ea5e9';

type SocialPlatform = keyof CentralAgentProfile['socialMedia'];

export interface AgentProfile {
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  headshotUrl?: string;
  logoUrl?: string;
  brandColor?: string;
  bio?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
    website?: string;
  };
}

interface ContactInfo {
  name: string;
  title: string;
  company: string;
  phone: string;
  email: string;
  website: string;
}

export interface AgentBrandingContextValue {
  profile: CentralAgentProfile | null;
  aiCardProfile: AICardProfile | null;
  loading: boolean;
  error: Error | null;
  hasProfile: boolean;
  brandColor: string;
  headshotUrl: string | null;
  logoUrl: string | null;
  uiProfile: UiAgentProfile;
  contact: ContactInfo;
  refresh: () => Promise<CentralAgentProfile>;
  getSocialLink: (platform: SocialPlatform) => string;
  getSignature: () => string;
  signature: string;
}

const normalizeError = (error: unknown): Error => {
  if (error instanceof Error) return error;
  return new Error(typeof error === 'string' ? error : 'Unknown agent branding error');
};

const SOCIAL_KEY_MAP: Record<string, UiAgentProfile['socials'][number]['platform']> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  twitter: 'Twitter',
  linkedin: 'LinkedIn',
  youtube: 'YouTube'
};

const buildUiProfile = (profile?: CentralAgentProfile | null, agentData?: AgentData | null): UiAgentProfile => {
  if (!profile && !agentData) return EMPTY_AGENT;

  // 1. Basic Info - Prioritize AI Card (profile) over legacy agentData
  const name = profile?.name || (agentData ? `${agentData.first_name} ${agentData.last_name}` : '');
  const email = profile?.email || agentData?.email || '';
  const phone = profile?.phone || agentData?.phone || '';
  const company = profile?.company || agentData?.company || '';
  const title = profile?.title || agentData?.title || '';
  const bio = profile?.bio || agentData?.bio || '';
  const website = profile?.website || agentData?.website || '';
  const headshot = profile?.headshotUrl || agentData?.headshot_url || null;

  // 2. Social Media - Prioritize AI Card
  const socialMedia = profile?.socialMedia || {
    facebook: '',
    instagram: '',
    twitter: '',
    linkedin: '',
    youtube: ''
  };

  // 3. Branding - Prioritize AI Card
  const brandColor = profile?.brandColor || '#0ea5e9'; // Default blue
  const logo = profile?.logoUrl || null;

  // Transform socialMedia object into the array format expected by UiAgentProfile
  const socials = Object.entries(socialMedia)
    .filter(([, url]) => typeof url === 'string' && url.trim().length > 0)
    .map(([platform, url]) => ({
      platform: (SOCIAL_KEY_MAP[platform] ??
        EMPTY_AGENT.socials[0]?.platform ??
        'Instagram') as UiAgentProfile['socials'][number]['platform'],
      url: url as string
    }));

  return {
    name,
    email,
    phone,
    company,
    title,
    bio,
    website,
    headshotUrl: headshot || '',
    logoUrl: logo || undefined,
    brandColor,
    socials: socials.length > 0 ? socials : EMPTY_AGENT.socials,
    slug: agentData?.slug,
    language: profile?.language || EMPTY_AGENT.language
  };
};

import { useImpersonation } from './ImpersonationContext';
import { getAgentData } from '../services/agentDataService';

export const AgentBrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<CentralAgentProfile | null>(() => getAgentProfileSnapshot() ?? null);
  const [aiCardProfile, setAiCardProfile] = useState<AICardProfile | null>(() => getAICardProfileSnapshot() ?? null);
  const [agentData, setAgentData] = useState<AgentData | null>(null);
  const [loading, setLoading] = useState(() => !profile);
  const [error, setError] = useState<Error | null>(null);

  const { impersonatedUserId } = useImpersonation();

  const uiProfile = useMemo(() => buildUiProfile(profile, agentData), [profile, agentData]);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = subscribeToProfileChanges((updatedProfile) => {
      if (!isMounted) return;
      setProfile(updatedProfile);
      setAiCardProfile(getAICardProfileSnapshot() ?? null);
      setError(null);
      setLoading(false);
    });

    const loadProfile = async () => {
      setLoading(true);
      try {
        // Load both AI Card profile and agent data in parallel
        // If impersonating, use the impersonated user ID
        const targetUserId = impersonatedUserId || undefined;

        const [aiProfile, agentInfo] = await Promise.all([
          getAgentProfile(targetUserId).catch(() => null),
          targetUserId
            ? getAgentData(targetUserId).catch(() => null)
            : getAuthenticatedAgentData().catch(() => null)
        ]);

        if (!isMounted) return;

        setProfile(aiProfile);
        setAgentData(agentInfo);
        setAiCardProfile(getAICardProfileSnapshot() ?? null);
        setError(null);

        if (agentInfo) {
          console.log('✅ Loaded agent data:', {
            name: `${agentInfo.first_name} ${agentInfo.last_name}`,
            email: agentInfo.email,
            slug: agentInfo.slug
          });
        }
      } catch (err) {
        if (!isMounted) return;
        setError(normalizeError(err));
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [impersonatedUserId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [data, agentInfo] = await Promise.all([
        refreshAgentProfile().catch(() => null),
        getAuthenticatedAgentData().catch(() => null)
      ]);

      setProfile(data);
      setAgentData(agentInfo);
      setAiCardProfile(getAICardProfileSnapshot() ?? null);
      setError(null);
      return data;
    } catch (err) {
      const normalized = normalizeError(err);
      setError(normalized);
      throw normalized;
    } finally {
      setLoading(false);
    }
  }, []);

  const contact = useMemo<ContactInfo>(() => ({
    name: uiProfile.name,
    title: uiProfile.title,
    company: uiProfile.company,
    phone: uiProfile.phone,
    email: uiProfile.email,
    website: uiProfile.website ?? ''
  }), [uiProfile]);

  const getSocialLink = useCallback(
    (platform: SocialPlatform) => {
      if (profile?.socialMedia && profile.socialMedia[platform]) {
        return profile.socialMedia[platform] ?? '';
      }
      const fallback = EMPTY_AGENT.socials.find(
        (social) => social.platform.toLowerCase() === platform.toLowerCase()
      );
      return fallback?.url ?? '';
    },
    [profile]
  );

  const getSignature = useCallback(() => {
    if (profile?.socialMedia?.emailSignature) {
      return profile.socialMedia.emailSignature;
    }

    const lines = [
      contact.name,
      [contact.title, contact.company].filter(Boolean).join(' | '),
      contact.phone,
      contact.email,
      contact.website
    ].filter((line) => line && line.trim().length > 0);
    return lines.join('\n');
  }, [contact, profile]);

  const signature = useMemo(() => getSignature(), [getSignature]);

  const contextValue = useMemo<AgentBrandingContextValue>(() => ({
    profile,
    aiCardProfile,
    loading,
    error,
    hasProfile: !!profile,
    brandColor: uiProfile.brandColor || DEFAULT_BRAND_COLOR,
    headshotUrl: uiProfile.headshotUrl ?? null,
    logoUrl: uiProfile.logoUrl ?? null,
    uiProfile,
    contact,
    refresh,
    getSocialLink,
    getSignature,
    signature
  }), [profile, aiCardProfile, loading, error, uiProfile, contact, refresh, getSocialLink, getSignature, signature]);

  return (
    <AgentBrandingContext.Provider value={contextValue}>
      {children}
    </AgentBrandingContext.Provider>
  );
};
