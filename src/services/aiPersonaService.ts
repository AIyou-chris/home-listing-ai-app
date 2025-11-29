import { supabase } from './supabase';

export type StoredRolePersonalityMap = Record<string, unknown>;

export interface RolePersonalityMapRecord {
  user_id: string;
  role_map: StoredRolePersonalityMap; // stored JSON
  updated_at?: string;
}

const TABLE = 'ai_role_personalities';

export const loadRoleMap = async (userId: string): Promise<StoredRolePersonalityMap | null> => {
  const { data, error } = await supabase
    .from(TABLE)
    .select('role_map')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.warn('loadRoleMap error', error.message);
    return null;
  }
  return (data?.role_map as StoredRolePersonalityMap) ?? null;
};

export const saveRoleMap = async (userId: string, roleMap: unknown): Promise<void> => {
  const { error } = await supabase
    .from(TABLE)
    .upsert({ user_id: userId, role_map: roleMap, updated_at: new Date().toISOString() });
  if (error) console.warn('saveRoleMap error', error.message);
};


