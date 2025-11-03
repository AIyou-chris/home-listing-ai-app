import { supabase } from './supabase';

export type RolePersonalityMap = Record<string, unknown>;

export interface RolePersonalityMapRecord {
  user_id: string;
  role_map: RolePersonalityMap; // stored JSON
  updated_at?: string;
}

const TABLE = 'ai_role_personalities';

export const loadRoleMap = async (userId: string): Promise<RolePersonalityMap | null> => {
  const { data, error } = await supabase
    .from(TABLE)
    .select('role_map')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.warn('loadRoleMap error', error.message);
    return null;
  }
  return data?.role_map ?? null;
};

export const saveRoleMap = async (userId: string, roleMap: RolePersonalityMap): Promise<void> => {
  const { error } = await supabase
    .from(TABLE)
    .upsert({ user_id: userId, role_map: roleMap, updated_at: new Date().toISOString() });
  if (error) console.warn('saveRoleMap error', error.message);
};


