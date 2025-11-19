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
import type { AgentProfile as UiAgentProfile } from '../types';
import { SAMPLE_AGENT } from '../constants';
import { AgentBrandingContext } from './AgentBrandingContextInstance';

const DEFAULT_BRAND_COLOR = '#0ea5e9';

type SocialPlatform = keyof CentralAgentProfile['socialMedia'];

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

const buildUiProfile = (profile?: CentralAgentProfile | null): UiAgentProfile => {
  if (!profile) return SAMPLE_AGENT;

  const socials =
    profile.socialMedia && typeof profile.socialMedia === 'object'
      ? Object.entries(profile.socialMedia)
          .filter(([, url]) => typeof url === 'string' && url.trim().length > 0)
          .map(([platform, url]) => ({
            platform: (SOCIAL_KEY_MAP[platform] ??
              SAMPLE_AGENT.socials[0]?.platform ??
              'Instagram') as UiAgentProfile['socials'][number]['platform'],
            url: url as string
          }))
      : [];

  return {
    name: profile.name || SAMPLE_AGENT.name,
    slug: profile.id || SAMPLE_AGENT.slug,
    title: profile.title || SAMPLE_AGENT.title,
    company: profile.company || SAMPLE_AGENT.company,
    phone: profile.phone || SAMPLE_AGENT.phone,
    email: profile.email || SAMPLE_AGENT.email,
    headshotUrl: profile.headshotUrl || SAMPLE_AGENT.headshotUrl,
    socials: socials.length > 0 ? socials : SAMPLE_AGENT.socials,
    brandColor: profile.brandColor || SAMPLE_AGENT.brandColor,
    logoUrl: profile.logoUrl || SAMPLE_AGENT.logoUrl,
    website: profile.website || SAMPLE_AGENT.website,
    bio: profile.bio || SAMPLE_AGENT.bio,
    language: profile.language || SAMPLE_AGENT.language
  };
};

export const AgentBrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<CentralAgentProfile | null>(() => getAgentProfileSnapshot() ?? null);
  const [aiCardProfile, setAiCardProfile] = useState<AICardProfile | null>(() => getAICardProfileSnapshot() ?? null);
  const [loading, setLoading] = useState(() => !profile);
  const [error, setError] = useState<Error | null>(null);
  const uiProfile = useMemo(() => buildUiProfile(profile), [profile]);

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
        const data = await getAgentProfile();
        if (!isMounted) return;
        setProfile(data);
        setAiCardProfile(getAICardProfileSnapshot() ?? null);
        setError(null);
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
  }, []);

const refresh = useCallback(async () => {
  setLoading(true);
  try {
    const data = await refreshAgentProfile();
    setProfile(data);
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
      const fallback = SAMPLE_AGENT.socials.find(
        (social) => social.platform.toLowerCase() === platform.toLowerCase()
      );
      return fallback?.url ?? '';
    },
    [profile]
  );

  const getSignature = useCallback(() => {
    const lines = [
      contact.name,
      [contact.title, contact.company].filter(Boolean).join(' | '),
      contact.phone,
      contact.email,
      contact.website
    ].filter((line) => line && line.trim().length > 0);
    return lines.join('\n');
  }, [contact]);

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
