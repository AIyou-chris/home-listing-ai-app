import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AICard from '../components/AICard';
import AICardEditor, { type AICardSidekickOption } from '../components/AICardEditor';
import Modal from '../components/Modal';
import type { AICardData, AICardDraft } from '../types/ai-card-builder';
import { getSidekicks, type AISidekick } from '../services/aiSidekicksService';
import { SIDEKICK_TEMPLATES } from '../constants/sidekickTemplates';
import QRCodeManagementPanel from '../components/QRCodeManagementPanel';
import {
	createAICardProfile,
	createAICardQRCode,
	getAICardProfile,
	listAICardQRCodes,
	updateAICardProfile,
	deleteAICardProfile,
	uploadAiCardAsset,
	type AICardProfile,
	type AICardQRCode
} from '../services/aiCardService';
import { createShortLink, getLinkStats } from '../services/linkShortenerService';
import {
	notifyProfileChange,
	type AgentProfile
} from '../services/agentProfileService';
import type { ChatBotContext } from '../services/helpSalesChatBot';
import AICardChatOverlay from '../components/AICardChatOverlay';
import { supabase } from '../services/supabase';

const DEFAULT_SIDEKICK_OPTIONS: AICardSidekickOption[] = SIDEKICK_TEMPLATES.map((template) => ({
	id: template.id,
	label: template.label
}));

const REBRANDLY_QR_META_KEY = 'homelistingai:qr-rebrandly-meta';
const LOCAL_PROFILE_STORAGE_KEY = 'homelistingai:demo-ai-card-profile';
const BASE_CHAT_CONTEXT: ChatBotContext = {
	userType: 'prospect',
	currentPage: 'ai-card',
	previousInteractions: 0
};
const DEFAULT_BRAND_COLOR = '#2563eb';
const DEFAULT_LANGUAGE = 'en';

const convertProfileToDraft = (profile: AICardProfile): AICardDraft => ({
	name: profile.fullName || '',
	title: profile.professionalTitle || '',
	bio: profile.bio || '',
	email: profile.email || '',
	phone: profile.phone || '',
	headshot: profile.headshot || '',
	logo: profile.logo || '',
	sidekickId: 'demo-sales-sidekick',
	socials: {
		linkedin: profile.socialMedia?.linkedin ?? '',
		instagram: profile.socialMedia?.instagram ?? '',
		x: profile.socialMedia?.twitter ?? ''
	},
	chatButtonText: 'Launch AI Chat',
	chatHelperText: 'Instantly launch a tailored AI conversation',
	customLinks: [
		{ label: 'Website', url: profile.website || '' },
		{ label: '', url: '' }
	],
	badgePrimary: profile.professionalTitle || 'AI Concierge',
	badgeSecondary: profile.company || 'Agent Assistant',
	headshotMimeType: undefined,
	logoMimeType: undefined,
	headshotStoragePath: undefined,
	logoStoragePath: undefined
});

const convertDraftToCard = (draft: AICardDraft, id: string): AICardData => ({
	id,
	name: draft.name || 'Your AI Concierge',
	title: draft.title || 'Trusted AI Assistant',
	bio: draft.bio,
	email: draft.email,
	phone: draft.phone,
	headshot: draft.headshot,
	logo: draft.logo,
	sidekickId: draft.sidekickId,
	socials: draft.socials,
	chatButtonText: draft.chatButtonText,
	chatHelperText: draft.chatHelperText,
	customLinks: draft.customLinks ?? [],
	badgePrimary: draft.badgePrimary,
	badgeSecondary: draft.badgeSecondary
});

const draftToProfilePayload = (draft: AICardDraft): Partial<AICardProfile> => {
	const payload: Partial<AICardProfile> = {
		fullName: draft.name?.trim(),
		professionalTitle: draft.title?.trim(),
		bio: draft.bio?.trim(),
		email: draft.email?.trim(),
		phone: draft.phone?.trim(),
		company: draft.badgeSecondary?.trim(),
		website: draft.customLinks?.[0]?.url?.trim() ?? '',
		brandColor: DEFAULT_BRAND_COLOR,
		language: DEFAULT_LANGUAGE,
		socialMedia: {
			linkedin: draft.socials.linkedin?.trim() ?? '',
			instagram: draft.socials.instagram?.trim() ?? '',
			twitter: draft.socials.x?.trim() ?? '',
			youtube: '',
			facebook: ''
		}
	};

	if (draft.headshotStoragePath) {
		payload.headshot = draft.headshotStoragePath;
	}
	if (draft.logoStoragePath) {
		payload.logo = draft.logoStoragePath;
	}

	return Object.fromEntries(
		Object.entries(payload).filter(([_, value]) => value !== undefined && value !== null)
	) as Partial<AICardProfile>;
};

const draftToCreatePayload = (draft: AICardDraft): Omit<AICardProfile, 'id' | 'created_at' | 'updated_at'> => ({
	fullName: draft.name?.trim() || 'AI Concierge',
	professionalTitle: draft.title?.trim() || 'AI Specialist',
	company: draft.badgeSecondary?.trim() || 'HomeListingAI',
	phone: draft.phone?.trim() || '',
	email: draft.email?.trim() || '',
	website: draft.customLinks?.[0]?.url?.trim() || '',
	bio: draft.bio?.trim() || '',
	brandColor: DEFAULT_BRAND_COLOR,
	language: DEFAULT_LANGUAGE,
	socialMedia: {
		facebook: '',
		instagram: draft.socials.instagram?.trim() ?? '',
		twitter: draft.socials.x?.trim() ?? '',
		linkedin: draft.socials.linkedin?.trim() ?? '',
		youtube: ''
	},
	headshot: draft.headshotStoragePath ?? '',
	logo: draft.logoStoragePath ?? ''
});

const draftToAgentProfile = (draft: AICardDraft, id: string): AgentProfile => ({
	id,
	name: draft.name || '',
	title: draft.title || '',
	company: draft.badgeSecondary || '',
	phone: draft.phone || '',
	email: draft.email || '',
	website: draft.customLinks?.[0]?.url || '',
	bio: draft.bio || '',
	headshotUrl: draft.headshot || null,
	logoUrl: draft.logo || null,
	brandColor: DEFAULT_BRAND_COLOR,
	language: DEFAULT_LANGUAGE,
	socialMedia: {
		facebook: '',
		instagram: draft.socials.instagram,
		twitter: draft.socials.x,
		linkedin: draft.socials.linkedin,
		youtube: ''
	}
});

const readLocalDraft = (fallback: () => AICardDraft): AICardDraft => {
	if (typeof window === 'undefined') return fallback();
	try {
		const stored = window.localStorage.getItem(LOCAL_PROFILE_STORAGE_KEY);
		if (!stored) return fallback();
		const parsed = JSON.parse(stored) as Partial<AICardDraft>;
		return {
			...fallback(),
			...parsed,
			socials: parsed.socials ?? fallback().socials,
			customLinks: parsed.customLinks ?? fallback().customLinks
		};
	} catch (error) {
		console.warn('[AICardBuilder] Failed to read local draft', error);
		return fallback();
	}
};

const writeLocalDraft = (draft: AICardDraft) => {
	if (typeof window === 'undefined') return;
	try {
		const payload: Partial<AICardDraft> = {
			name: draft.name,
			title: draft.title,
			bio: draft.bio,
			email: draft.email,
			phone: draft.phone,
			headshot: draft.headshot,
			logo: draft.logo,
			sidekickId: draft.sidekickId,
			socials: draft.socials,
			chatButtonText: draft.chatButtonText,
			chatHelperText: draft.chatHelperText,
			customLinks: draft.customLinks,
			badgePrimary: draft.badgePrimary,
			badgeSecondary: draft.badgeSecondary
		};
		window.localStorage.setItem(LOCAL_PROFILE_STORAGE_KEY, JSON.stringify(payload));
	} catch (error) {
		console.warn('[AICardBuilder] Failed to persist local draft', error);
	}
};

const ensureHttps = (value: string): string => {
	if (!value) return value;
	if (value.startsWith('http://') || value.startsWith('https://')) {
		return value;
	}
	return `https://${value.replace(/^\/+/, '')}`;
};

const demoCard: AICardData = {
	id: 'demo-card',
	name: 'Skyler The Concierge',
	title: 'AI Sales Sidekick',
	bio: 'I qualify leads, nurture relationships, and deliver high-converting follow-ups while you relax with your clients.',
	email: 'skyler.ai@homelistingai.com',
	phone: '(213) 555-8890',
	headshot: 'https://images.unsplash.com/photo-1520975916090-3105956dac38?q=80&w=400&auto=format&fit=crop',
	logo: 'https://images.unsplash.com/photo-1618005198935-3ca36d4efdc5?q=80&w=200&auto=format&fit=crop',
	sidekickId: 'demo-sales-sidekick',
	socials: {
		linkedin: 'https://linkedin.com/company/homelistingai',
		instagram: 'https://instagram.com/homelistingai',
		x: 'https://x.com/homelistingai'
	},
	chatButtonText: 'Launch AI Chat',
	chatHelperText: 'Instantly launch a tailored AI conversation',
	customLinks: [
		{ label: 'See My Listings', url: 'https://calendly.com' },
		{ label: 'View Testimonials', url: 'https://homelistingai.com/testimonials' }
	],
	badgePrimary: 'AI Concierge',
	badgeSecondary: 'AI Sales Sidekick'
};

const AICardBuilderPage: React.FC = () => {
	const [cards, setCards] = useState<AICardData[]>([]);
	const [mode, setMode] = useState<'grid' | 'create'>('grid');
	const [sidekickOptions, setSidekickOptions] = useState<AICardSidekickOption[]>(DEFAULT_SIDEKICK_OPTIONS);
	const [showQrModal, setShowQrModal] = useState(false);
	const [qrCodes, setQrCodes] = useState<AICardQRCode[]>([]);
	const [isQrLoading, setIsQrLoading] = useState(false);
	const [qrListError, setQrListError] = useState<string | null>(null);
	const [qrForm, setQrForm] = useState({ label: '', destinationUrl: '' });
	const [isSavingQr, setIsSavingQr] = useState(false);
	const [qrCreateError, setQrCreateError] = useState<string | null>(null);
	const [copiedQrId, setCopiedQrId] = useState<string | null>(null);
	const copyTimeoutRef = useRef<number | null>(null);
	const linkMetaRef = useRef<Record<string, { linkId: string; shortUrl: string }>>({});
	const [qrLinkStats, setQrLinkStats] = useState<Record<string, { clicks: number; uniqueClicks: number }>>({});
	const [profileId, setProfileId] = useState<string | null>(null);
	const [isProfileLoading, setIsProfileLoading] = useState(true);
	const [profileError, setProfileError] = useState<string | null>(null);
	const [isSavingProfile, setIsSavingProfile] = useState(false);
	const [isDeletingCard, setIsDeletingCard] = useState(false);
	const [uploadingAssets, setUploadingAssets] = useState<{ headshot: boolean; logo: boolean }>({
		headshot: false,
		logo: false
	});
	const [isQrPanelOpen, setIsQrPanelOpen] = useState(true);
	const [isDemoMode, setIsDemoMode] = useState(false);
	const [sessionUserId, setSessionUserId] = useState<string | null>(null);

	useEffect(() => {
		return () => {
			if (copyTimeoutRef.current) {
				window.clearTimeout(copyTimeoutRef.current);
			}
		};
	}, []);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		const mediaQuery = window.matchMedia('(max-width: 640px)');
		const updatePanelState = () => setIsQrPanelOpen(!mediaQuery.matches);
		updatePanelState();
		if (mediaQuery.addEventListener) {
			mediaQuery.addEventListener('change', updatePanelState);
			return () => mediaQuery.removeEventListener('change', updatePanelState);
		} else {
			// Safari fallback
			mediaQuery.addListener(updatePanelState);
			return () => mediaQuery.removeListener(updatePanelState);
		}
	}, []);

	const loadStoredLinkMeta = useCallback((): Record<string, { linkId: string; shortUrl: string }> => {
		if (typeof window === 'undefined') return {};
		try {
			const raw = window.localStorage.getItem(REBRANDLY_QR_META_KEY);
			if (!raw) return {};
			return JSON.parse(raw) as Record<string, { linkId: string; shortUrl: string }>;
		} catch (error) {
			console.warn('[AICardBuilder] Unable to read Rebrandly metadata cache', error);
			return {};
		}
	}, []);

	const persistLinkMeta = useCallback((meta: Record<string, { linkId: string; shortUrl: string }>) => {
		if (typeof window === 'undefined') return;
		try {
			window.localStorage.setItem(REBRANDLY_QR_META_KEY, JSON.stringify(meta));
		} catch (error) {
			console.warn('[AICardBuilder] Unable to persist Rebrandly metadata cache', error);
		}
	}, []);

	useEffect(() => {
		linkMetaRef.current = loadStoredLinkMeta();
	}, [loadStoredLinkMeta]);

	const refreshRebrandlyStats = useCallback(
		async (
			codes: AICardQRCode[],
			metaMap: Record<string, { linkId: string; shortUrl: string }> = linkMetaRef.current
		) => {
			if (!codes.length) {
				setQrLinkStats({});
				return;
			}
			const results = await Promise.all(
				codes.map(async (code) => {
					const meta = metaMap[code.id];
					if (!meta?.linkId) return null;
					try {
						const stats = await getLinkStats(meta.linkId);
						return { id: code.id, stats };
					} catch (error) {
						console.warn('[AICardBuilder] Unable to fetch Rebrandly stats', error);
						return null;
					}
				})
			);
			const next: Record<string, { clicks: number; uniqueClicks: number }> = {};
			results.forEach((entry) => {
				if (entry) {
					next[entry.id] = entry.stats;
				}
			});
			setQrLinkStats(next);
		},
		[]
	);

	const buildOptionsFromSidekicks = useCallback(
		(sidekicksData: AISidekick[]): AICardSidekickOption[] => {
			const typeMap = new Map<string, AISidekick>();
			sidekicksData.forEach((sidekick) => {
				const typeKey =
					(typeof sidekick.metadata?.type === 'string' && sidekick.metadata.type) ||
					(sidekick.type ?? '').toString();
				if (typeKey && !typeMap.has(typeKey)) {
					typeMap.set(typeKey, sidekick);
				}
			});

			const templateOptions = SIDEKICK_TEMPLATES.map((template) => {
				const matching =
					sidekicksData.find((sidekick) => sidekick.name === template.defaultName) ||
					typeMap.get(template.id) ||
					typeMap.get(template.type);
				return {
					id: matching ? matching.id : template.id,
					label: template.label
				};
			});

			const usedIds = new Set(templateOptions.map((option) => option.id));
			const additional = sidekicksData
				.filter((sidekick) => !usedIds.has(sidekick.id))
				.map((sidekick) => ({
					id: sidekick.id,
					label: sidekick.name || sidekick.id
				}));

			return [...templateOptions, ...additional];
		},
		[]
	);

	const loadQRCodes = useCallback(async () => {
		if (isDemoMode) {
			setQrCodes([]);
			setQrLinkStats({});
			return;
		}
		setIsQrLoading(true);
		setQrListError(null);
		try {
			const codes = await listAICardQRCodes();
			const storedMeta = linkMetaRef.current;
			const retainedMeta = codes.reduce<Record<string, { linkId: string; shortUrl: string }>>((acc, code) => {
				const meta = storedMeta[code.id];
				if (meta) {
					acc[code.id] = meta;
				}
				return acc;
			}, {});
			if (Object.keys(retainedMeta).length !== Object.keys(storedMeta).length) {
				linkMetaRef.current = retainedMeta;
				persistLinkMeta(retainedMeta);
			}
			setQrCodes(codes);
			await refreshRebrandlyStats(codes, retainedMeta);
		} catch (error) {
			console.error('[AICardBuilder] Failed to load QR codes', error);
			setQrListError(error instanceof Error ? error.message : 'Failed to load QR codes');
		} finally {
			setIsQrLoading(false);
		}
	}, [isDemoMode, persistLinkMeta, refreshRebrandlyStats]);

	const buildEmptyDraft = useCallback((): AICardDraft => ({
		name: '',
		title: '',
		bio: '',
		email: '',
		phone: '',
		headshot: '',
		logo: '',
		sidekickId: sidekickOptions[0]?.id ?? '',
		socials: {
			linkedin: '',
			instagram: '',
			x: ''
		},
		chatButtonText: 'Launch AI Chat',
		chatHelperText: 'Instantly launch a tailored AI conversation',
		customLinks: [
			{ label: '', url: '' },
			{ label: '', url: '' }
	],
	badgePrimary: 'AI Concierge',
	badgeSecondary: sidekickOptions[0]?.label ?? 'AI Sidekick'
	}), [sidekickOptions]);

const sanitizeStoragePath = (value?: string) => {
	if (!value) return undefined;
	const trimmed = value.trim();
	if (!trimmed) return undefined;
	if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return undefined;
	return trimmed;
};

const reconcileDemoAssets = useCallback(
	async (
		userId: string,
		existingProfile: AICardProfile | null,
		localDraft: AICardDraft
	): Promise<{ profile: AICardProfile; draft: AICardDraft } | null> => {
		const fields: Array<{
			key: 'headshot' | 'logo';
			storageKey: 'headshotStoragePath' | 'logoStoragePath';
		}> = [
			{ key: 'headshot', storageKey: 'headshotStoragePath' },
			{ key: 'logo', storageKey: 'logoStoragePath' }
		];

		const assetUpdates: Partial<AICardProfile> = {};
		const storagePaths: Partial<Pick<AICardDraft, 'headshotStoragePath' | 'logoStoragePath'>> = {};

		const createFileFromDataUrl = (dataUrl: string, fileLabel: string): File => {
			const matches = dataUrl.match(/^data:(.+?);base64,(.+)$/);
			if (!matches) {
				throw new Error('Unsupported data URL format');
			}
			const mime = matches[1] || 'image/png';
			const base64 = matches[2];
			const binary = atob(base64);
			const buffer = new Uint8Array(binary.length);
			for (let index = 0; index < binary.length; index += 1) {
				buffer[index] = binary.charCodeAt(index);
			}
			const extension = mime.split('/')[1] ?? 'png';
			return new File([buffer], `${fileLabel}.${extension}`, { type: mime });
		};

		for (const { key, storageKey } of fields) {
			const value = localDraft[key];
			if (!value || typeof value !== 'string' || !value.startsWith('data:')) {
				continue;
			}
			try {
				const file = createFileFromDataUrl(value, `${key}-${Date.now()}`);
				const { path } = await uploadAiCardAsset(key, file, userId);
				if (path) {
					assetUpdates[key] = path;
					storagePaths[storageKey] = path;
				}
			} catch (error) {
				console.error(`[AICardBuilder] Failed to upload ${key} asset`, error);
			}
		}

		if (!Object.keys(assetUpdates).length) {
			return null;
		}

		try {
			let nextProfile: AICardProfile;
			if (existingProfile) {
				nextProfile = await updateAICardProfile(assetUpdates, userId);
			} else {
				const draftForCreate: AICardDraft = {
					...buildEmptyDraft(),
					...localDraft,
					...storagePaths
				};
				nextProfile = await createAICardProfile(draftToCreatePayload(draftForCreate), userId);
			}

			const draftFromProfile = convertProfileToDraft(nextProfile);
			const nextDraft: AICardDraft = {
				...draftFromProfile,
				...storagePaths
			};

			return {
				profile: nextProfile,
				draft: nextDraft
			};
		} catch (error) {
			console.error('[AICardBuilder] Failed to persist reconciled profile assets', error);
			return null;
		}
	},
	[buildEmptyDraft]
);

	const [editorDraft, setEditorDraft] = useState<AICardDraft>(buildEmptyDraft);

const applyProfile = useCallback(
	(profile: AICardProfile, overrides: Partial<AICardDraft> = {}, shouldNotify = false) => {
		const baseDraft = convertProfileToDraft(profile);
		const mergedOverrides = Object.fromEntries(
			Object.entries(overrides).filter(([, value]) => value !== undefined)
		) as Partial<AICardDraft>;
		const nextDraft: AICardDraft = {
			...baseDraft,
			...mergedOverrides
		};
		setProfileId(profile.id);
		setEditorDraft(nextDraft);
		setCards([convertDraftToCard(nextDraft, profile.id)]);
		writeLocalDraft(nextDraft);
		if (shouldNotify) {
			notifyProfileChange(draftToAgentProfile(nextDraft, profile.id));
		}
	},
	[setCards]
);

	const [activeChatCard, setActiveChatCard] = useState<AICardData | null>(null);

	const userCards = useMemo(() => cards, [cards]);
	const qrPreviewCard = userCards[0] ?? demoCard;
	const defaultQrDestination = useMemo(() => {
		const firstCustomLink = (qrPreviewCard.customLinks ?? []).find(
			(link) => link.url && link.url.trim().length > 0
		);
		if (firstCustomLink?.url) {
			return ensureHttps(firstCustomLink.url.trim());
		}
		if (typeof window !== 'undefined') {
			const origin = window.location.origin || 'https://homelistingai.com';
			const path = window.location.pathname || '';
			const search = window.location.search || '';
			return ensureHttps(`${origin}${path}${search}`);
		}
		return 'https://homelistingai.com';
	}, [qrPreviewCard.customLinks]);
	const qrStats = useMemo(() => {
		const total = qrCodes.length;
		const totalScans = qrCodes.reduce((sum, code) => sum + (code.totalScans || 0), 0);
		const averageScans = total > 0 ? Math.round(totalScans / total) : 0;
		return {
			total,
			totalScans,
			averageScans
		};
	}, [qrCodes]);
	const chatContext = useMemo<ChatBotContext | null>(() => {
		if (!activeChatCard) return null;
		return {
			userType: 'prospect',
			currentPage: 'ai-card',
			previousInteractions: 0,
			userInfo: {
				name: activeChatCard.name || undefined,
				email: activeChatCard.email || undefined,
				company: activeChatCard.badgePrimary || activeChatCard.title || undefined
			}
		};
	}, [activeChatCard]);
	const voicePrompt = useMemo(() => {
		if (!activeChatCard) return undefined;
		const sections = [
			`You are the AI sidekick representing ${activeChatCard.name}, the ${activeChatCard.title}.`,
			activeChatCard.bio ? `Biography:\n${activeChatCard.bio}` : '',
			activeChatCard.badgePrimary
				? `Primary positioning: ${activeChatCard.badgePrimary}.`
				: '',
			'Keep responses concise, service-oriented, and focused on booking next steps or answering client questions with empathy.'
		].filter(Boolean);
		return sections.join('\n\n');
	}, [activeChatCard]);
	const editButtonLabel = 'Build Your AI Card';

	const handleEditCard = () => {
		setMode('create');
	};

	const handleDraftChange = (update: Partial<AICardDraft>) => {
		setEditorDraft((previous) => {
			const nextSocials = update.socials ? { ...previous.socials, ...update.socials } : previous.socials;
			const nextCustomLinks = update.customLinks ?? previous.customLinks;

			let nextDraft: AICardDraft = {
				...previous,
				...update,
				socials: nextSocials,
				customLinks: nextCustomLinks
			};

			if (update.title !== undefined) {
				const prevBadgePrimary = previous.badgePrimary?.trim() ?? '';
				const prevTitle = previous.title?.trim() ?? '';
				const badgeWasDefault =
					!prevBadgePrimary || prevBadgePrimary === prevTitle || prevBadgePrimary === 'AI Concierge';
				if (badgeWasDefault) {
					nextDraft = {
						...nextDraft,
						badgePrimary: update.title.trim()
					};
				}
			}

			if (update.sidekickId !== undefined) {
				const nextOption = sidekickOptions.find((option) => option.id === update.sidekickId);
				const prevOption = sidekickOptions.find((option) => option.id === previous.sidekickId);
				const prevLabel = prevOption?.label ?? '';
				const badgeWasDefault =
					!previous.badgeSecondary ||
					previous.badgeSecondary.trim().length === 0 ||
					previous.badgeSecondary.trim() === prevLabel;

				if (badgeWasDefault && nextOption?.label) {
					nextDraft = {
						...nextDraft,
						badgeSecondary: nextOption.label
					};
				}
			}

			setCards((prevCards) => {
				if (!prevCards.length) return prevCards;
				const cardId = prevCards[0].id;
				return [convertDraftToCard(nextDraft, cardId)];
			});

			return nextDraft;
		});
	};

	const handleSaveCard = async () => {
		setIsSavingProfile(true);
		setProfileError(null);
		try {
			if (isDemoMode || !sessionUserId) {
				const cardId = profileId ?? 'demo-local-profile';
				setCards([convertDraftToCard(editorDraft, cardId)]);
				writeLocalDraft(editorDraft);
				notifyProfileChange(draftToAgentProfile(editorDraft, cardId));
				setProfileId(cardId);
				setMode('grid');
				return;
			}

			let storedProfile: AICardProfile;
			if (profileId) {
				const payload = draftToProfilePayload(editorDraft);
				storedProfile = await updateAICardProfile(payload);
			} else {
				const payload = draftToCreatePayload(editorDraft);
				storedProfile = await createAICardProfile(payload);
			}

			setProfileId(storedProfile.id);
			const nextDraft: AICardDraft = {
				...convertProfileToDraft(storedProfile),
				headshotStoragePath: editorDraft.headshotStoragePath,
				logoStoragePath: editorDraft.logoStoragePath
			};
			setEditorDraft(nextDraft);
			setCards([convertDraftToCard(nextDraft, storedProfile.id)]);
			writeLocalDraft(nextDraft);
			notifyProfileChange(draftToAgentProfile(nextDraft, storedProfile.id));
			setMode('grid');
		} catch (error) {
			console.error('[AICardBuilder] Failed to save AI card profile', error);
			setProfileError(
				error instanceof Error ? error.message : 'Failed to save your AI card profile. Please try again.'
			);
		} finally {
			setIsSavingProfile(false);
		}
	};

	const handleDeleteCurrentCard = async () => {
		if (!cards.length && !profileId) return;
		if (isDeletingCard) return;
		const confirmed = window.confirm(
			'Delete this AI card? You can always build another one later.'
		);
		if (!confirmed) return;

		setIsDeletingCard(true);
		setProfileError(null);
		try {
			if (!isDemoMode && sessionUserId) {
				await deleteAICardProfile(sessionUserId);
			}
			const blankDraft = buildEmptyDraft();
			setActiveChatCard(null);
			setCards([]);
			setEditorDraft(blankDraft);
			setProfileId(null);
			setQrCodes([]);
			setQrLinkStats({});
			writeLocalDraft(blankDraft);
			if (typeof window !== 'undefined') {
				window.localStorage.removeItem(LOCAL_PROFILE_STORAGE_KEY);
			}
			notifyProfileChange(draftToAgentProfile(blankDraft, 'demo-local-profile'));
		} catch (error) {
			console.error('[AICardBuilder] Failed to delete AI card profile', error);
			setProfileError('Failed to delete your AI card. Please try again.');
		} finally {
			setIsDeletingCard(false);
		}
	};

	const handleLaunchChat = (card: AICardData) => {
		setActiveChatCard(card);
	};

	const handleCloseChat = () => {
		setActiveChatCard(null);
	};

	const handleCreateQr = () => {
		setQrForm({ label: '', destinationUrl: '' });
		setQrCreateError(isDemoMode ? 'Sign in to generate QR codes for sharing.' : null);
		setShowQrModal(true);
	};

	const handleDownloadQr = (code: AICardQRCode) => {
		if (!code.qrSvg) return;
		const link = document.createElement('a');
		link.href = code.qrSvg;
		link.download = `${(code.label || 'qr-code').replace(/\s+/g, '-').toLowerCase()}.svg`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	const handleCopyQrLink = async (url: string, id: string) => {
		try {
			if (navigator.clipboard) {
				await navigator.clipboard.writeText(url);
				setCopiedQrId(id);
				if (copyTimeoutRef.current) {
					window.clearTimeout(copyTimeoutRef.current);
				}
				copyTimeoutRef.current = window.setTimeout(() => {
					setCopiedQrId(null);
				}, 2000);
			}
		} catch (error) {
			console.error('[AICardBuilder] Failed to copy QR link via clipboard API', error);
			try {
				const temp = document.createElement('textarea');
				temp.value = url;
				temp.setAttribute('readonly', '');
				temp.style.position = 'absolute';
				temp.style.left = '-9999px';
				document.body.appendChild(temp);
				temp.select();
				document.execCommand('copy');
				document.body.removeChild(temp);
				setCopiedQrId(id);
				if (copyTimeoutRef.current) {
					window.clearTimeout(copyTimeoutRef.current);
				}
				copyTimeoutRef.current = window.setTimeout(() => {
					setCopiedQrId(null);
				}, 2000);
			} catch (fallbackError) {
				console.error('[AICardBuilder] Clipboard fallback failed', fallbackError);
				setQrListError('Unable to copy QR link automatically. Please copy it manually.');
			}
		}
	};

	const handleUploadAsset = useCallback(
		async (field: 'headshot' | 'logo', file: File) => {
			if (isDemoMode) {
				return new Promise<void>((resolve) => {
					const reader = new FileReader();
					reader.onload = () => {
						const result = typeof reader.result === 'string' ? reader.result : '';
						setEditorDraft((previous) => {
							const nextDraft: AICardDraft = {
								...previous,
								[field]: result
							};
							setCards((prevCards) => {
								const cardId = prevCards[0]?.id ?? 'demo-local-profile';
								return [convertDraftToCard(nextDraft, cardId)];
							});
							writeLocalDraft(nextDraft);
							return nextDraft;
						});
						resolve();
					};
					reader.readAsDataURL(file);
				});
			}
			setUploadingAssets((previous) => ({ ...previous, [field]: true }));
			setProfileError(null);
			try {
				const { path, url } = await uploadAiCardAsset(field, file);
				setEditorDraft((previous) => {
					const nextDraft: AICardDraft = {
						...previous,
						[field]: url ?? previous[field],
						[field === 'headshot' ? 'headshotStoragePath' : 'logoStoragePath']: path
					};
					setCards((prevCards) => {
						const cardId = prevCards[0]?.id ?? profileId ?? 'preview-card';
						return [convertDraftToCard(nextDraft, cardId)];
					});
					return nextDraft;
				});
			} catch (error) {
				console.error('[AICardBuilder] Failed to upload asset', error);
				setProfileError(
					error instanceof Error ? error.message : 'Upload failed. Please try again.'
				);
			} finally {
				setUploadingAssets((previous) => ({ ...previous, [field]: false }));
			}
		},
		[isDemoMode, profileId]
	);

	const handleSubmitQr = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const label = qrForm.label.trim();
		const rawDestination = qrForm.destinationUrl.trim();
		if (!label) {
			setQrCreateError('Label is required');
			return;
		}
		if (isDemoMode || !sessionUserId) {
			setQrCreateError('Sign in to generate QR codes for sharing.');
			return;
		}
		setIsSavingQr(true);
		setQrCreateError(null);
		try {
			const resolvedDestination = ensureHttps(rawDestination || defaultQrDestination);
			let shortUrl = resolvedDestination;
			let rebrandlyLinkId: string | undefined;

			try {
				const shortLink = await createShortLink({
					destination: resolvedDestination,
					title: `${qrPreviewCard.name || 'AI Concierge'} QR`,
					tags: ['qr-code', 'ai-card']
				});
				shortUrl = ensureHttps(shortLink.shortUrl);
				rebrandlyLinkId = shortLink.id;
			} catch (error) {
				console.warn('[AICardBuilder] Rebrandly link creation failed, falling back to direct URL', error);
				setQrCreateError('Rebrandly link unavailable. Created QR with direct URL.');
			}

			const createdCode = await createAICardQRCode({
				label,
				destinationUrl: shortUrl,
				metadata: rebrandlyLinkId ? { rebrandlyLinkId } : undefined
			});

			if (rebrandlyLinkId) {
				const updatedMeta = {
					...linkMetaRef.current,
					[createdCode.id]: { linkId: rebrandlyLinkId, shortUrl }
				};
				linkMetaRef.current = updatedMeta;
				persistLinkMeta(updatedMeta);
				try {
					const stats = await getLinkStats(rebrandlyLinkId);
					setQrLinkStats((previous) => ({ ...previous, [createdCode.id]: stats }));
				} catch (error) {
					console.warn('[AICardBuilder] Unable to load initial Rebrandly stats', error);
				}
			}

			setQrCodes((previous) => [createdCode, ...previous]);
			setShowQrModal(false);
			setQrForm({ label: '', destinationUrl: '' });
		} catch (error) {
			console.error('[AICardBuilder] Failed to create QR code', error);
			setQrCreateError(error instanceof Error ? error.message : 'Failed to create QR code');
		} finally {
			setIsSavingQr(false);
		}
	};


	useEffect(() => {
		let isMounted = true;

	const fetchProfile = async () => {
		setIsProfileLoading(true);
		setProfileError(null);
		const localDraftSnapshot = readLocalDraft(buildEmptyDraft);
		try {
			const { data, error } = await supabase.auth.getUser();
			if (!isMounted) return;
			if (error) {
				console.warn('[AICardBuilder] Unable to resolve Supabase user', error);
			}
			const userId = data?.user?.id ?? null;
			setSessionUserId(userId);

			if (!userId) {
				setIsDemoMode(true);
				setProfileId('demo-local-profile');
				setEditorDraft(localDraftSnapshot);
				setCards([convertDraftToCard(localDraftSnapshot, 'demo-local-profile')]);
				setIsProfileLoading(false);
				return;
			}

			setIsDemoMode(false);
			const controller = new AbortController();
			const timeoutId = window.setTimeout(() => controller.abort(), 8000);

			try {
				const profile = await getAICardProfile(userId, controller.signal);
				if (!isMounted) return;

				const reconciliation = await reconcileDemoAssets(userId, profile, localDraftSnapshot);
				if (!isMounted) return;
				if (reconciliation) {
					const overrides: Partial<AICardDraft> = {};
					if (reconciliation.draft.headshotStoragePath) {
						overrides.headshotStoragePath = reconciliation.draft.headshotStoragePath;
					}
					if (reconciliation.draft.logoStoragePath) {
						overrides.logoStoragePath = reconciliation.draft.logoStoragePath;
					}
					applyProfile(reconciliation.profile, overrides, true);
				} else if (profile) {
					const overrides: Partial<AICardDraft> = {};
					const sanitizedHeadshot = sanitizeStoragePath(localDraftSnapshot.headshotStoragePath);
					const sanitizedLogo = sanitizeStoragePath(localDraftSnapshot.logoStoragePath);
					if (sanitizedHeadshot) {
						overrides.headshotStoragePath = sanitizedHeadshot;
					}
					if (sanitizedLogo) {
						overrides.logoStoragePath = sanitizedLogo;
					}
					applyProfile(profile, overrides);
				}
			} catch (error) {
				if (!isMounted) return;
				const message = error instanceof Error ? error.message : String(error);
				if (message.includes('404')) {
					const reconciliation = await reconcileDemoAssets(userId, null, localDraftSnapshot);
					if (!isMounted) return;
					if (reconciliation) {
						const overrides: Partial<AICardDraft> = {};
						if (reconciliation.draft.headshotStoragePath) {
							overrides.headshotStoragePath = reconciliation.draft.headshotStoragePath;
						}
						if (reconciliation.draft.logoStoragePath) {
							overrides.logoStoragePath = reconciliation.draft.logoStoragePath;
						}
						applyProfile(reconciliation.profile, overrides, true);
					} else {
						setProfileId(null);
						setEditorDraft(localDraftSnapshot);
						setCards([convertDraftToCard(localDraftSnapshot, 'demo-local-profile')]);
						setProfileError(null);
					}
				} else if (message.includes('AbortError')) {
					setProfileError('Connection timed out while loading your AI card profile.');
				} else if (message.toLowerCase().includes('auth')) {
					setIsDemoMode(true);
					setProfileId('demo-local-profile');
					setEditorDraft(localDraftSnapshot);
					setCards([convertDraftToCard(localDraftSnapshot, 'demo-local-profile')]);
					setProfileError(null);
				} else {
					setProfileError('Failed to load your AI card profile. Please try again.');
					console.error('[AICardBuilder] Unable to load profile', error);
				}
			} finally {
				window.clearTimeout(timeoutId);
				if (isMounted) {
					setIsProfileLoading(false);
				}
			}
		} catch (error) {
			if (!isMounted) return;
			console.error('[AICardBuilder] Unexpected error resolving profile', error);
			setIsDemoMode(true);
			setProfileId('demo-local-profile');
			setEditorDraft(localDraftSnapshot);
			setCards([convertDraftToCard(localDraftSnapshot, 'demo-local-profile')]);
			setProfileError(null);
			setIsProfileLoading(false);
		}
	};

	void fetchProfile();

		(async () => {
			try {
				const { sidekicks } = await getSidekicks();
				if (!isMounted) return;
				const options = buildOptionsFromSidekicks(sidekicks);
				setSidekickOptions(options.length ? options : DEFAULT_SIDEKICK_OPTIONS);
			} catch (error) {
				console.warn('[AICardBuilder] failed to load sidekicks, using defaults', error);
			}
		})();
		return () => {
			isMounted = false;
		};
	}, [buildOptionsFromSidekicks, buildEmptyDraft, applyProfile, reconcileDemoAssets]);

	useEffect(() => {
		void loadQRCodes();
	}, [loadQRCodes]);

	useEffect(() => {
		if (!sidekickOptions.length) return;
		if (!sidekickOptions.find((option) => option.id === editorDraft.sidekickId)) {
			const fallbackOption = sidekickOptions[0];
			setEditorDraft((previous) => ({
				...previous,
				sidekickId: fallbackOption?.id ?? '',
				badgeSecondary: previous.badgeSecondary && previous.badgeSecondary.trim().length > 0
					? previous.badgeSecondary
					: fallbackOption?.label ?? previous.badgeSecondary
			}));
		}
	}, [sidekickOptions, editorDraft.sidekickId]);

	const qrPanelChildren = (() => {
		if (qrListError) {
			return (
				<div className="flex flex-col items-center gap-3 text-center">
					<p className="text-sm font-semibold text-rose-600">{qrListError}</p>
					<button
						type="button"
						onClick={() => void loadQRCodes()}
						className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary-600 shadow ring-1 ring-primary-200 transition hover:bg-primary-50"
					>
						<span className="material-symbols-outlined text-base">refresh</span>
						Retry
					</button>
				</div>
			);
		}

		if (isQrLoading) {
			return (
				<div className="flex items-center justify-center gap-2 text-sm text-slate-500">
					<span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
					Loading QR codes…
				</div>
			);
		}

		if (!qrCodes.length) {
			return undefined;
		}

		return (
			<div className="grid w-full gap-4 md:grid-cols-2 xl:grid-cols-3">
				{qrCodes.map((code) => {
					const stats = qrLinkStats[code.id];
					return (
					<div
						key={code.id}
						className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-5 text-center shadow-sm"
					>
						<div className="flex flex-col items-center gap-3">
							<div className="h-32 w-32 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-inner">
								{code.qrSvg ? (
									<img src={code.qrSvg} alt={`${code.label} QR code`} className="h-full w-full object-contain" />
								) : (
									<span className="material-symbols-outlined text-4xl text-primary-500">qr_code_2</span>
								)}
							</div>
							<div>
								<p className="text-sm font-semibold text-slate-900">{code.label}</p>
								{code.destinationUrl && (
									<p className="mt-1 max-w-[220px] break-words text-xs text-slate-500">{code.destinationUrl}</p>
								)}
							</div>
						</div>
						<div className="flex w-full flex-wrap justify-center gap-2">
							<button
								type="button"
								onClick={() => handleDownloadQr(code)}
								className="inline-flex items-center gap-1 rounded-full bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:ring-offset-1"
							>
								<span className="material-symbols-outlined text-base">download</span>
								Download
							</button>
							{code.destinationUrl && (
								<button
									type="button"
									onClick={() => handleCopyQrLink(code.destinationUrl, code.id)}
									className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:ring-offset-1"
								>
									<span className="material-symbols-outlined text-base">
										{copiedQrId === code.id ? 'check_small' : 'content_copy'}
									</span>
									{copiedQrId === code.id ? 'Copied' : 'Copy Link'}
								</button>
							)}
						</div>
						<div className="space-y-1 text-[11px] text-slate-500">
							<div>
								{code.totalScans || 0} total scans ·{' '}
								{code.lastScannedAt ? new Date(code.lastScannedAt).toLocaleDateString() : 'Never scanned'}
							</div>
							{stats && (
								<div className="text-primary-600">
									Rebrandly clicks: {stats.clicks} · Unique: {stats.uniqueClicks}
								</div>
							)}
						</div>
					</div>
				);
				})}
			</div>
		);
	})();

	return (
		<section className="flex h-full flex-col space-y-8 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
			{mode === 'grid' ? (
				<>
					{isProfileLoading && cards.length === 0 && (
						<div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
							Loading your AI card profile…
						</div>
					)}
					{profileError && (
						<div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
							{profileError}
						</div>
					)}
					<QRCodeManagementPanel
						className="mt-2"
						onCreate={handleCreateQr}
						stats={qrStats}
						loading={isQrLoading}
						open={isQrPanelOpen}
						onToggle={(next) => setIsQrPanelOpen(next)}
					>
						{qrPanelChildren}
					</QRCodeManagementPanel>

					<header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<h1 className="text-3xl font-semibold text-slate-900">AI Card Builder</h1>
							<p className="mt-1 text-sm text-slate-500">
								Design AI concierge cards with voice/chat launchers, then deploy them across your funnel.
							</p>
						</div>
						<button
							type="button"
							onClick={handleEditCard}
							className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
							disabled={isProfileLoading || isDeletingCard}
						>
							<span className="material-symbols-outlined text-base">add_circle</span>
							{editButtonLabel}
						</button>
					</header>

					<div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
						<div className="flex flex-col gap-3">
								<AICard card={qrPreviewCard} onLaunch={handleLaunchChat} />
							<div className="flex flex-wrap justify-end gap-2">
								<button
									type="button"
									onClick={handleEditCard}
									className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
										disabled={isProfileLoading || isDeletingCard}
								>
									<span className="material-symbols-outlined text-base">edit</span>
									{cards.length ? 'Edit Card' : 'Customize Card'}
								</button>
									<button
										type="button"
										onClick={handleDeleteCurrentCard}
										className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
										disabled={isProfileLoading || isDeletingCard || cards.length === 0}
									>
										<span className="material-symbols-outlined text-base">delete</span>
										Delete Card
									</button>
							</div>
						</div>
						{userCards.length === 0 ? (
							<div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-slate-500">
								<span className="material-symbols-outlined text-4xl text-primary-500">styler</span>
								<p className="mt-4 max-w-xs text-sm">
									No cards yet. Tap &ldquo;Build Your AI Card&rdquo; to design a concierge in minutes.
								</p>
							</div>
						) : (
							userCards.slice(1).map((card) => (
								<AICard key={card.id} card={card} onLaunch={handleLaunchChat} />
							))
						)}
					</div>

					<AICardChatOverlay
						open={Boolean(activeChatCard)}
						onClose={handleCloseChat}
						assistantName={activeChatCard?.name ?? 'AI Concierge'}
						sidekickId={activeChatCard?.sidekickId}
						context={chatContext ?? BASE_CHAT_CONTEXT}
						voicePrompt={voicePrompt}
					/>
					{showQrModal && (
						<Modal title="Create QR Code" onClose={() => setShowQrModal(false)}>
							<form className="flex flex-col gap-4 px-6 py-6" onSubmit={handleSubmitQr}>
								{isDemoMode && (
									<div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
										Sign in to generate live QR codes. This demo view shows the layout only.
									</div>
								)}
								<div>
									<label htmlFor="qr-label" className="block text-sm font-semibold text-slate-700">
										Label
									</label>
									<input
										id="qr-label"
										name="qr-label"
										type="text"
										value={qrForm.label}
										onChange={(event) =>
											setQrForm((previous) => ({ ...previous, label: event.target.value }))
										}
										placeholder="Open House Sign"
										className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-200"
										disabled={isSavingQr || isDemoMode}
									/>
								</div>
								<div>
									<label htmlFor="qr-destination" className="block text-sm font-semibold text-slate-700">
										Destination URL (optional)
									</label>
									<input
										id="qr-destination"
										name="qr-destination"
										type="url"
										value={qrForm.destinationUrl}
										onChange={(event) =>
											setQrForm((previous) => ({ ...previous, destinationUrl: event.target.value }))
										}
										placeholder="https://homelistingai.com/listings"
										className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-200"
										disabled={isSavingQr || isDemoMode}
									/>
									<p className="mt-1 text-xs text-slate-500">
										Leave blank to link directly to your AI card experience.
									</p>
								</div>
								{qrCreateError && (
									<div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
										{qrCreateError}
									</div>
								)}
								<div className="flex justify-end gap-3 pt-2">
									<button
										type="button"
										onClick={() => setShowQrModal(false)}
										className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:ring-offset-1"
										disabled={isSavingQr}
									>
										Cancel
									</button>
									<button
										type="submit"
										className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
										disabled={isSavingQr || isDemoMode}
									>
										<span className="material-symbols-outlined text-base">
											{isSavingQr ? 'progress_activity' : 'qr_code_2_add'}
										</span>
										{isSavingQr ? 'Creating…' : isDemoMode ? 'Sign in to create' : 'Create QR Code'}
									</button>
								</div>
							</form>
						</Modal>
					)}
				</>
			) : (
				<>
					{profileError && (
						<div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
							{profileError}
						</div>
					)}
					<AICardEditor
						mode="page"
						value={editorDraft}
						onChange={handleDraftChange}
						onCancel={() => setMode('grid')}
						onSave={handleSaveCard}
						sidekickOptions={sidekickOptions}
						onUploadAsset={handleUploadAsset}
						uploading={uploadingAssets}
						isSaving={isSavingProfile}
					/>
				</>
			)}
		</section>
	);
};

export default AICardBuilderPage;

