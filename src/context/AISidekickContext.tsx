import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { AIPersonality } from '../types';
import { AI_PERSONALITIES } from '../constants';
import { loadRoleMap, saveRoleMap } from '../services/aiPersonaService';
import { resolveUserId } from '../services/userId';

export type AISidekickRole = 'agent' | 'listing' | 'helper' | 'marketing' | 'sales' | 'god';

export interface RolePersonality {
	personalityId: string;
	voiceId?: string;
}

export interface RolePersonalityMap {
	defaultRole: AISidekickRole;
	byRole: Record<AISidekickRole, RolePersonality>;
	customOverrides: string[];
}

const DEFAULT_ROLE_MAP: RolePersonalityMap = {
	defaultRole: 'agent',
	byRole: {
		agent: { personalityId: 'pers-1' },
		listing: { personalityId: 'pers-2' },
		helper: { personalityId: 'pers-3' },
		marketing: { personalityId: 'pers-3' },
		sales: { personalityId: 'pers-1' },
		god: { personalityId: 'pers-4' }
	},
	customOverrides: []
};

interface ContextValue {
	roleMap: RolePersonalityMap;
	setRolePersonality: (role: AISidekickRole, personalityId: string) => void;
	setDefaultRole: (role: AISidekickRole) => void;
	getPersonality: (role: AISidekickRole) => AIPersonality;
	addOverride: (line: string) => void;
}

const Ctx = createContext<ContextValue | null>(null);

const STORAGE_KEY = 'hlai_role_personality_map_v1';

export const AISidekickProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [roleMap, setRoleMap] = useState<RolePersonalityMap>(() => {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			return raw ? JSON.parse(raw) as RolePersonalityMap : DEFAULT_ROLE_MAP;
		} catch {
			return DEFAULT_ROLE_MAP;
		}
	});

	useEffect(() => {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(roleMap));
		} catch {}
		// Persist to Supabase if logged in (local auth stub provides uid)
		const uid = resolveUserId();
		if (uid && uid !== 'local') {
			saveRoleMap(uid as string, roleMap).catch(() => {});
		}
	}, [roleMap]);

	// Hydrate on mount from Supabase (fallback to localStorage already done)
	useEffect(() => {
		const uid = resolveUserId();
		if (!uid) return;
		loadRoleMap(uid).then(remote => {
			if (remote) setRoleMap(remote as RolePersonalityMap);
		}).catch(() => {});
	}, []);

	const setRolePersonality = (role: AISidekickRole, personalityId: string) => {
		setRoleMap(prev => ({
			...prev,
			byRole: { ...prev.byRole, [role]: { ...prev.byRole[role], personalityId } }
		}));
	};

	const setDefaultRole = (role: AISidekickRole) => {
		setRoleMap(prev => ({ ...prev, defaultRole: role }));
	};

	const getPersonality = (role: AISidekickRole): AIPersonality => {
		const pid = roleMap.byRole[role]?.personalityId;
		const found = AI_PERSONALITIES.find(p => p.id === pid) || AI_PERSONALITIES[0];
		return found;
	};

	const addOverride = (line: string) => {
		if (!line.trim()) return;
		setRoleMap(prev => ({ ...prev, customOverrides: [...prev.customOverrides, line] }));
	};

	const value = useMemo<ContextValue>(() => ({
		roleMap,
		setRolePersonality,
		setDefaultRole,
		getPersonality,
		addOverride
	}), [roleMap]);

	return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useAISidekicks = (): ContextValue => {
	const v = useContext(Ctx);
	if (!v) throw new Error('useAISidekicks must be used within AISidekickProvider');
	return v;
};


