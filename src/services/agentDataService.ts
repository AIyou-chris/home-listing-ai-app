import { supabase } from './supabase';

/**
 * Agent Data Service
 * Fetches agent information from the agents table based on auth user
 */

export interface AgentData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  slug: string;
  status: string;
  payment_status: string;
  auth_user_id: string | null;
  headshot_url?: string | null;
  phone?: string | null;
  company?: string | null;
  title?: string | null;
  bio?: string | null;
  website?: string | null;
  created_at: string;
  activated_at?: string | null;
}

/**
 * Get agent data for the currently authenticated user
 */
export const getAuthenticatedAgentData = async (): Promise<AgentData | null> => {
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error('Error getting authenticated user:', authError);
      return null;
    }

    if (!user) {
      console.log('No authenticated user found');
      return null;
    }

    return getAgentData(user.id);
  } catch (error) {
    console.error('Exception in getAuthenticatedAgentData:', error);
    return null;
  }
};

/**
 * Get agent data by user ID
 */
export const getAgentData = async (userId: string): Promise<AgentData | null> => {
  try {
    // Query agents table by auth_user_id
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('auth_user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching agent data:', error);
      return null;
    }

    if (!data) {
      console.log('No agent record found for user:', userId);
      return null;
    }

    console.log('✅ Retrieved agent data:', {
      name: `${data.first_name} ${data.last_name}`,
      slug: data.slug,
      status: data.status
    });

    return data as AgentData;
  } catch (error) {
    console.error('Exception in getAgentData:', error);
    return null;
  }
};

/**
 * Get agent data by slug
 */
export const getAgentDataBySlug = async (slug: string): Promise<AgentData | null> => {
  try {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      console.error('Error fetching agent data by slug:', error);
      return null;
    }

    return data as AgentData | null;
  } catch (error) {
    console.error('Exception in getAgentDataBySlug:', error);
    return null;
  }
};

/**
 * Update agent headshot URL
 */
export const updateAgentHeadshot = async (headshotUrl: string): Promise<boolean> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Error getting authenticated user for headshot update');
      return false;
    }

    const { error } = await supabase
      .from('agents')
      .update({ headshot_url: headshotUrl })
      .eq('auth_user_id', user.id);

    if (error) {
      console.error('Error updating agent headshot:', error);
      return false;
    }

    console.log('✅ Updated agent headshot');
    return true;
  } catch (error) {
    console.error('Exception in updateAgentHeadshot:', error);
    return false;
  }
};

/**
 * Update agent profile information
 */
export const updateAgentProfile = async (updates: {
  phone?: string;
  company?: string;
  title?: string;
  bio?: string;
  website?: string;
  headshot_url?: string;
}): Promise<boolean> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Error getting authenticated user for profile update');
      return false;
    }

    const { error } = await supabase
      .from('agents')
      .update(updates)
      .eq('auth_user_id', user.id);

    if (error) {
      console.error('Error updating agent profile:', error);
      return false;
    }

    console.log('✅ Updated agent profile');
    return true;
  } catch (error) {
    console.error('Exception in updateAgentProfile:', error);
    return false;
  }
};
