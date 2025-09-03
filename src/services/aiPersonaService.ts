import { supabase } from './supabase';

export interface RolePersonalityMapRecord {
	user_id: string;
	role_map: any; // stored JSON
	updated_at?: string;
}

const TABLE = 'ai_role_personalities';

export const loadRoleMap = async (userId: string): Promise<any | null> => {
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

export const saveRoleMap = async (userId: string, roleMap: any): Promise<void> => {
	const { error } = await supabase
		  .from(TABLE)
		.upsert({ user_id: userId, role_map: roleMap, updated_at: new Date().toISOString() });
	if (error) console.warn('saveRoleMap error', error.message);
};


