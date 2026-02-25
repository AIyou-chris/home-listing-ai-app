import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import type { AIPersonality } from '../types';
import { AI_PERSONALITIES } from '../constants';
import { loadRoleMap, saveRoleMap, type RolePersonalityMap as PersistedRoleMap } from '../services/aiPersonaService';
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

const normalizeRemoteRoleMap = (remote: PersistedRoleMap | null): RolePersonalityMap | null => {
	if (!remote || typeof remote !== 'object') return null;
	const candidate = remote as {
		defaultRole?: string;
		byRole?: Record<string, { personalityId?: string; voiceId?: string }>;
		customOverrides?: unknown;
	};
	if (!candidate.byRole || typeof candidate.byRole !== 'object') return null;

	return {
		defaultRole: (candidate.defaultRole as AISidekickRole) || DEFAULT_ROLE_MAP.defaultRole,
		byRole: {
			agent: { personalityId: candidate.byRole.agent?.personalityId || DEFAULT_ROLE_MAP.byRole.agent.personalityId, voiceId: candidate.byRole.agent?.voiceId },
			listing: { personalityId: candidate.byRole.listing?.personalityId || DEFAULT_ROLE_MAP.byRole.listing.personalityId, voiceId: candidate.byRole.listing?.voiceId },
			helper: { personalityId: candidate.byRole.helper?.personalityId || DEFAULT_ROLE_MAP.byRole.helper.personalityId, voiceId: candidate.byRole.helper?.voiceId },
			marketing: { personalityId: candidate.byRole.marketing?.personalityId || DEFAULT_ROLE_MAP.byRole.marketing.personalityId, voiceId: candidate.byRole.marketing?.voiceId },
			sales: { personalityId: candidate.byRole.sales?.personalityId || DEFAULT_ROLE_MAP.byRole.sales.personalityId, voiceId: candidate.byRole.sales?.voiceId },
			god: { personalityId: candidate.byRole.god?.personalityId || DEFAULT_ROLE_MAP.byRole.god.personalityId, voiceId: candidate.byRole.god?.voiceId }
		},
		customOverrides: Array.isArray(candidate.customOverrides)
			? candidate.customOverrides.map(String).filter(Boolean)
			: []
	};
};

export const AISidekickProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [roleMap, setRoleMap] = useState<RolePersonalityMap>(() => {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			return raw ? JSON.parse(raw) as RolePersonalityMap : DEFAULT_ROLE_MAP;
		} catch (error) {
			console.error('[AISidekickContext] Failed to read role map from storage:', error);
			return DEFAULT_ROLE_MAP;
		}
	});

	useEffect(() => {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(roleMap));
		} catch (error) {
			console.error('[AISidekickContext] Failed to persist role map to storage:', error);
		}
		// Persist to Supabase if logged in (local auth stub provides uid)
		const uid = resolveUserId();
		if (uid && uid !== 'local') {
			saveRoleMap(uid as string, roleMap as unknown as PersistedRoleMap).catch(error => {
				console.error('[AISidekickContext] Failed to persist role map remotely:', error);
			});
		}
	}, [roleMap]);

	// Hydrate on mount from Supabase (fallback to localStorage already done)
	useEffect(() => {
		const uid = resolveUserId();
		if (!uid) return;
		loadRoleMap(uid).then(remote => {
			const normalized = normalizeRemoteRoleMap(remote);
			if (normalized) setRoleMap(normalized);
		}).catch(error => {
			console.error('[AISidekickContext] Failed to load role map remotely:', error);
		});
	}, []);

	const setRolePersonality = useCallback((role: AISidekickRole, personalityId: string) => {
		setRoleMap(prev => ({
			...prev,
			byRole: { ...prev.byRole, [role]: { ...prev.byRole[role], personalityId } }
		}));
	}, []);

	const setDefaultRole = useCallback((role: AISidekickRole) => {
		setRoleMap(prev => ({ ...prev, defaultRole: role }));
	}, []);

	const getPersonality = useCallback((role: AISidekickRole): AIPersonality => {
		const pid = roleMap.byRole[role]?.personalityId;
		const found = AI_PERSONALITIES.find(p => p.id === pid) || AI_PERSONALITIES[0];
		return found;
	}, [roleMap]);

	const addOverride = useCallback((line: string) => {
		if (!line.trim()) return;
		setRoleMap(prev => ({ ...prev, customOverrides: [...prev.customOverrides, line] }));
	}, []);

	const value = useMemo<ContextValue>(() => ({
		roleMap,
		setRolePersonality,
		setDefaultRole,
		getPersonality,
		addOverride
	}), [roleMap, setRolePersonality, setDefaultRole, getPersonality, addOverride]);

	return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAISidekicks = (): ContextValue => {
	const v = useContext(Ctx);
	if (!v) throw new Error('useAISidekicks must be used within AISidekickProvider');
	return v;
};

