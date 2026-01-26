import { getAICardProfile, updateAICardProfile, type AICardProfile } from './aiCardService';
import { BLUEPRINT_AGENT } from '../constants/agentBlueprintData';

// Centralized Agent Profile Service
// Uses AI Card as the master profile source

export interface AgentProfile {
  id: string;
  name: string;
  title: string;
  company: string;
  phone: string;
  email: string;
  website: string;
  bio: string;
  headshotUrl: string | null;
  logoUrl: string | null;
  brandColor: string;
  language: string;
  socialMedia: {
    facebook: string;
    instagram: string;
    twitter: string;
    linkedin: string;
    youtube: string;
    emailSignature?: string;
  };
  // Additional fields that might be needed across the app
  licenseNumber?: string;
  yearsExperience?: number;
  specialties?: string[];
  serviceAreas?: string[];
  created_at?: string;
  updated_at?: string;
}

type ProfileSource = 'supabase' | 'demo';

type LoadOptions = {
  userId?: string;
  signal?: AbortSignal;
  force?: boolean;
  source?: ProfileSource;
  demoProfile?: AgentProfile;
};

let cachedAgentProfile: AgentProfile | null = null;
let cachedAICardProfile: AICardProfile | null = null;
let cachedSource: ProfileSource | null = null;
let cachedUserId: string | undefined;
let inflightLoad: Promise<AgentProfile> | null = null;
let profileChangeListeners: Array<(profile: AgentProfile) => void> = [];

const setCachedProfiles = (
  agentProfile: AgentProfile,
  options: {
    aiCardProfile?: AICardProfile | null;
    source?: ProfileSource;
    userId?: string;
    notify?: boolean;
  } = {}
) => {
  cachedAgentProfile = agentProfile;
  if (options.aiCardProfile !== undefined) {
    cachedAICardProfile = options.aiCardProfile;
  }
  cachedSource = options.source ?? cachedSource ?? 'supabase';
  if (options.userId !== undefined) {
    cachedUserId = options.userId;
  }
  if (options.notify !== false) {
    profileChangeListeners.forEach((listener) => {
      try {
        listener(agentProfile);
      } catch (error) {
        console.error('Error in profile change listener:', error);
      }
    });
  }
};

const shouldUseCache = (options: LoadOptions = {}) => {
  if (!cachedAgentProfile) return false;
  if (options.force) return false;
  if (options.source && cachedSource && options.source !== cachedSource) return false;
  if (options.userId && cachedUserId && options.userId !== cachedUserId) return false;
  if (options.source === 'demo' && cachedSource !== 'demo') return false;
  if (options.demoProfile && cachedSource !== 'demo') return false;
  return true;
};

const loadProfile = async (options: LoadOptions = {}): Promise<AgentProfile> => {
  if (shouldUseCache(options)) {
    return cachedAgentProfile as AgentProfile;
  }

  if (inflightLoad && !options.force) {
    return inflightLoad;
  }

  const execute = async () => {
    // 0. Blueprint Agent Bypass (No Network)
    if (options.userId === 'blueprint-agent') {
      console.log('🏗️ Loading Blueprint Agent Profile (Local)');
      // Map to Service AgentProfile type if needed (they match structurally mostly)
      const profile = BLUEPRINT_AGENT as unknown as AgentProfile;
      setCachedProfiles(profile, {
        source: 'demo',
        userId: 'blueprint-agent',
        notify: true
      });
      return profile;
    }

    if (options.source === 'demo' || options.demoProfile) {
      const demoProfile =
        options.demoProfile ??
        cachedAgentProfile ??
        (() => {
          throw new Error('Demo profile requested but no data provided.');
        })();
      setCachedProfiles(demoProfile, {
        aiCardProfile: cachedAICardProfile,
        source: 'demo',
        userId: options.userId,
        notify: true
      });
      return demoProfile;
    }

    const aiCardProfile = await getAICardProfile(options.userId, options.signal);
    const agentProfile = convertAICardToAgentProfile(aiCardProfile);
    setCachedProfiles(agentProfile, {
      aiCardProfile,
      source: 'supabase',
      userId: options.userId,
      notify: true
    });
    console.log('✅ Retrieved centralized agent profile');
    return agentProfile;
  };

  inflightLoad = execute()
    .catch((error) => {
      inflightLoad = null;
      throw error;
    })
    .then((result) => {
      inflightLoad = null;
      return result;
    });

  return inflightLoad;
};

export const getAgentProfileSnapshot = () => cachedAgentProfile;

export const getAICardProfileSnapshot = () => cachedAICardProfile;

export const resetAgentProfileStore = () => {
  cachedAgentProfile = null;
  cachedAICardProfile = null;
  cachedSource = null;
  cachedUserId = undefined;
  inflightLoad = null;
};

export const refreshAgentProfile = async (options: LoadOptions = {}) => {
  return loadProfile({ ...options, force: true });
};

// Convert AI Card profile to standard Agent Profile format
const convertAICardToAgentProfile = (aiCardProfile: AICardProfile): AgentProfile => {
  return {
    id: aiCardProfile.id,
    name: aiCardProfile.fullName,
    title: aiCardProfile.professionalTitle,
    company: aiCardProfile.company,
    phone: aiCardProfile.phone,
    email: aiCardProfile.email,
    website: aiCardProfile.website,
    bio: aiCardProfile.bio,
    headshotUrl: aiCardProfile.headshot,
    logoUrl: aiCardProfile.logo,
    brandColor: aiCardProfile.brandColor,
    language: aiCardProfile.language,
    socialMedia: aiCardProfile.socialMedia,
    created_at: aiCardProfile.created_at,
    updated_at: aiCardProfile.updated_at
  };
};

// Convert Agent Profile back to AI Card format
const convertAgentProfileToAICard = (agentProfile: Partial<AgentProfile>): Partial<AICardProfile> => {
  const aiCardData: Partial<AICardProfile> = {};

  if (agentProfile.name !== undefined) aiCardData.fullName = agentProfile.name;
  if (agentProfile.title !== undefined) aiCardData.professionalTitle = agentProfile.title;
  if (agentProfile.company !== undefined) aiCardData.company = agentProfile.company;
  if (agentProfile.phone !== undefined) aiCardData.phone = agentProfile.phone;
  if (agentProfile.email !== undefined) aiCardData.email = agentProfile.email;
  if (agentProfile.website !== undefined) aiCardData.website = agentProfile.website;
  if (agentProfile.bio !== undefined) aiCardData.bio = agentProfile.bio;
  if (agentProfile.headshotUrl !== undefined) aiCardData.headshot = agentProfile.headshotUrl;
  if (agentProfile.logoUrl !== undefined) aiCardData.logo = agentProfile.logoUrl;
  if (agentProfile.brandColor !== undefined) aiCardData.brandColor = agentProfile.brandColor;
  if (agentProfile.language !== undefined) aiCardData.language = agentProfile.language;
  if (agentProfile.socialMedia !== undefined) aiCardData.socialMedia = agentProfile.socialMedia;

  return aiCardData;
};

const buildLoadOptions = (
  arg1?: string | LoadOptions,
  arg2?: LoadOptions
): LoadOptions => {
  if (typeof arg1 === 'string' || arg1 === undefined) {
    return { ...arg2, userId: typeof arg1 === 'string' ? arg1 : arg2?.userId };
  }
  return { ...arg1 };
};

// Get the master agent profile (from AI Card)
export const getAgentProfile = async (
  arg1?: string | LoadOptions,
  arg2?: LoadOptions
): Promise<AgentProfile> => {
  try {
    const options = buildLoadOptions(arg1, arg2);
    return await loadProfile(options);
  } catch (error) {
    console.error('Error getting agent profile:', error);
    throw error;
  }
};

// Update the master agent profile (updates AI Card)
export const updateAgentProfile = async (profileData: Partial<AgentProfile>, userId?: string): Promise<AgentProfile> => {
  try {
    const aiCardData = convertAgentProfileToAICard(profileData);
    const updatedAICard = await updateAICardProfile(aiCardData);
    const updatedAgentProfile = convertAICardToAgentProfile(updatedAICard);
    setCachedProfiles(updatedAgentProfile, {
      aiCardProfile: updatedAICard,
      source: 'supabase',
      userId,
      notify: true
    });
    console.log('✅ Updated centralized agent profile');
    return updatedAgentProfile;
  } catch (error) {
    console.error('Error updating agent profile:', error);
    throw error;
  }
};

// Get profile data for specific use cases
export const getProfileForDashboard = async (userId?: string) => {
  const profile = await getAgentProfile(userId);
  return {
    name: profile.name,
    title: profile.title,
    company: profile.company,
    headshotUrl: profile.headshotUrl,
    email: profile.email,
    phone: profile.phone,
    language: profile.language
  };
};

export const getProfileForSettings = async (userId?: string) => {
  const profile = await getAgentProfile(userId);
  return {
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    company: profile.company,
    title: profile.title,
    website: profile.website,
    bio: profile.bio,
    headshotUrl: profile.headshotUrl,
    brandColor: profile.brandColor,
    language: profile.language,
    socialMedia: profile.socialMedia
  };
};

export const getProfileForCommunications = async (userId?: string) => {
  const profile = await getAgentProfile(userId);
  return {
    agentName: profile.name,
    agentTitle: profile.title,
    agentCompany: profile.company,
    agentPhone: profile.phone,
    agentEmail: profile.email,
    agentWebsite: profile.website,
    language: profile.language,
    signature: `${profile.name}\n${profile.title}\n${profile.company}\n${profile.phone}\n${profile.email}`
  };
};

export const getProfileForAppointments = async (userId?: string) => {
  const profile = await getAgentProfile(userId);
  return {
    hostName: profile.name,
    hostTitle: profile.title,
    hostCompany: profile.company,
    hostPhone: profile.phone,
    hostEmail: profile.email,
    brandColor: profile.brandColor,
    language: profile.language
  };
};

// Listen for profile changes (for real-time updates across components)
export const subscribeToProfileChanges = (callback: (profile: AgentProfile) => void) => {
  profileChangeListeners.push(callback);
  if (cachedAgentProfile) {
    try {
      callback(cachedAgentProfile);
    } catch (error) {
      console.error('Error in profile change listener:', error);
    }
  }

  // Return unsubscribe function
  return () => {
    profileChangeListeners = profileChangeListeners.filter(listener => listener !== callback);
  };
};

// Notify all listeners when profile changes
export const notifyProfileChange = (profile: AgentProfile, options: { source?: ProfileSource; userId?: string } = {}) => {
  setCachedProfiles(profile, {
    aiCardProfile: cachedAICardProfile,
    source: options.source ?? cachedSource ?? 'supabase',
    userId: options.userId ?? cachedUserId,
    notify: true
  });
};

// Enhanced update function that notifies listeners
export const updateAgentProfileWithNotification = async (profileData: Partial<AgentProfile>, userId?: string): Promise<AgentProfile> => {
  const updatedProfile = await updateAgentProfile(profileData, userId);
  notifyProfileChange(updatedProfile, { source: 'supabase', userId });
  return updatedProfile;
};

export type { AICardProfile };
