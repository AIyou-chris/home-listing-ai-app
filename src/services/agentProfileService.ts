import { getAICardProfile, updateAICardProfile, type AICardProfile } from './aiCardService';

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
  };
  // Additional fields that might be needed across the app
  licenseNumber?: string;
  yearsExperience?: number;
  specialties?: string[];
  serviceAreas?: string[];
  created_at?: string;
  updated_at?: string;
}

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

// Get the master agent profile (from AI Card)
export const getAgentProfile = async (userId?: string): Promise<AgentProfile> => {
  try {
    const aiCardProfile = await getAICardProfile(userId);
    const agentProfile = convertAICardToAgentProfile(aiCardProfile);
    
    console.log('✅ Retrieved centralized agent profile');
    return agentProfile;
  } catch (error) {
    console.error('Error getting agent profile:', error);
    throw error;
  }
};

// Update the master agent profile (updates AI Card)
export const updateAgentProfile = async (profileData: Partial<AgentProfile>, userId?: string): Promise<AgentProfile> => {
  try {
    const aiCardData = convertAgentProfileToAICard(profileData);
    const updatedAICard = await updateAICardProfile(aiCardData, userId);
    const updatedAgentProfile = convertAICardToAgentProfile(updatedAICard);
    
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
let profileChangeListeners: Array<(profile: AgentProfile) => void> = [];

export const subscribeToProfileChanges = (callback: (profile: AgentProfile) => void) => {
  profileChangeListeners.push(callback);
  
  // Return unsubscribe function
  return () => {
    profileChangeListeners = profileChangeListeners.filter(listener => listener !== callback);
  };
};

// Notify all listeners when profile changes
export const notifyProfileChange = (profile: AgentProfile) => {
  profileChangeListeners.forEach(listener => {
    try {
      listener(profile);
    } catch (error) {
      console.error('Error in profile change listener:', error);
    }
  });
};

// Enhanced update function that notifies listeners
export const updateAgentProfileWithNotification = async (profileData: Partial<AgentProfile>, userId?: string): Promise<AgentProfile> => {
  const updatedProfile = await updateAgentProfile(profileData, userId);
  notifyProfileChange(updatedProfile);
  return updatedProfile;
};

export type { AICardProfile };
