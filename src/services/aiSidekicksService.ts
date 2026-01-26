import { resolveUserId } from './userId';

export interface Voice {
  id: string;
  name: string;
  openaiVoice: string;
  gender: 'male' | 'female' | 'neutral';
  description?: string;
}

export interface AISidekick {
  id: string;
  userId: string;
  type: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  voiceId: string;
  knowledgeBase: string[];
  personality: {
    description: string;
    traits: string[];
    preset: string;
  };
  stats: {
    totalTraining: number;
    positiveFeedback: number;
    improvements: number;
  };
  metadata?: Record<string, unknown>;
}

export interface CreateSidekickPayload {
  name: string;
  description: string;
  voiceId: string;
  personality: {
    description: string;
    traits: string[];
    preset: string;
  };
  metadata?: {
    type?: string;
    icon?: string;
    color?: string;
    [key: string]: unknown;
  };
}

export interface PersonalityPreset {
  name: string;
  description: string;
  traits: string[];
}

export const personalityPresets: Record<string, PersonalityPreset> = {
  professional: {
    name: 'Professional Advisor',
    description:
      'Polished, trustworthy, and precise. Ideal for high-touch clients who expect concierge-level service and clarity.',
    traits: ['professional', 'detail-oriented', 'trustworthy']
  },
  creative: {
    name: 'Creative Strategist',
    description:
      'High-energy copywriter who delivers catchy hooks, scroll-stopping captions, and aspirational storytelling for listings.',
    traits: ['creative', 'energetic', 'conversion-focused']
  },
  analytical: {
    name: 'Analytical Specialist',
    description:
      'Data-driven, composed, and thorough. Perfect for pricing intelligence, market analysis, and complex client questions.',
    traits: ['analytical', 'thorough', 'calm']
  },
  sales: {
    name: 'Closer Mode',
    description:
      'Persuasive and confident with strong objection handling. Designed for lead follow-up, pipeline progression, and CTAs.',
    traits: ['persuasive', 'confident', 'results-driven']
  },
  concierge: {
    name: 'Concierge Assistant',
    description:
      'Empathetic, organized taskmaster. Keeps VIP buyers and sellers informed and supported at every step.',
    traits: ['empathetic', 'organized', 'supportive']
  },
  custom: {
    name: 'Custom Personality',
    description:
      'Start from scratch and define a unique personality, tone, and guardrails tailored to your business.',
    traits: []
  }
};

const getApiBaseUrl = (): string => {
  const raw = (import.meta as unknown as { env?: Record<string, unknown> })?.env?.VITE_API_BASE_URL;
  if (typeof raw !== 'string' || raw.trim() === '') {
    return '';
  }
  return raw.replace(/\/+$/, '');
};

const API_BASE = getApiBaseUrl();

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID_REGEX.test(value);

const buildUrl = (path: string, params?: Record<string, unknown>) => {
  const query = params
    ? Object.entries(params)
      .filter(
        ([, value]) =>
          value !== undefined &&
          value !== null &&
          !(typeof value === 'string' && value.length === 0)
      )
      .map(
        ([key, value]) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
      )
      .join('&')
    : '';
  const base = API_BASE || '';
  return `${base}${path}${query ? `?${query}` : ''}`;
};

const normalizeVoice = (voice: unknown): Voice => {
  const record = voice as Partial<Voice> | Record<string, unknown> | undefined;
  const gender = record && typeof record === 'object' ? (record as Record<string, unknown>).gender : undefined;

  const resolvedGender =
    gender === 'male' || gender === 'female' || gender === 'neutral' ? gender : 'neutral';

  return {
    id: typeof record?.id === 'string' ? record.id : 'nova',
    name:
      typeof record?.name === 'string' ? record.name : 'Nova — Warm & Energetic',
    openaiVoice: typeof record?.openaiVoice === 'string' ? record.openaiVoice : 'nova',
    gender: resolvedGender,
    description: typeof record?.description === 'string' ? record.description : undefined
  };
};

const normalizeSidekick = (raw: unknown): AISidekick => {
  const record =
    raw && typeof raw === 'object' ? (raw as Partial<AISidekick>) : ({} as Partial<AISidekick>);

  const knowledgeBase =
    Array.isArray(record.knowledgeBase) && record.knowledgeBase.length > 0
      ? record.knowledgeBase
        .map((entry: unknown) =>
          typeof entry === 'string' ? entry : JSON.stringify(entry)
        )
        .filter((entry: string) => entry.trim().length > 0)
      : [];

  const personalitySource = (record.personality ?? {}) as Partial<AISidekick['personality']>;
  const traits =
    Array.isArray(personalitySource.traits) && personalitySource.traits.length > 0
      ? personalitySource.traits
        .map((trait: unknown) => (typeof trait === 'string' ? trait.trim() : ''))
        .filter((trait: string) => trait.length > 0)
      : [];

  const statsSource = (record.stats ?? {}) as Partial<AISidekick['stats']>;

  return {
    id: typeof record.id === 'string' ? record.id : '',
    userId: typeof record.userId === 'string' ? record.userId : '',
    type: typeof record.type === 'string' ? record.type : 'agent',
    name: typeof record.name === 'string' ? record.name : 'AI Sidekick',
    description:
      typeof record.description === 'string' && record.description.trim().length > 0
        ? record.description.trim()
        : 'AI assistant to support your real estate workflows.',
    color: typeof record.color === 'string' ? record.color : '#6366F1',
    icon: typeof record.icon === 'string' ? record.icon : '🤖',
    voiceId:
      typeof record.voiceId === 'string' && record.voiceId.trim().length > 0
        ? record.voiceId.trim()
        : 'nova',
    knowledgeBase,
    personality: {
      description:
        typeof personalitySource.description === 'string' &&
          personalitySource.description.trim().length > 0
          ? personalitySource.description.trim()
          : 'Be a proactive, trustworthy assistant who keeps communication crisp and on-brand.',
      traits,
      preset:
        typeof personalitySource.preset === 'string' && personalitySource.preset.trim().length > 0
          ? personalitySource.preset.trim()
          : 'custom'
    },
    stats: {
      totalTraining: Number.isFinite(statsSource.totalTraining ?? NaN)
        ? (statsSource.totalTraining as number)
        : 0,
      positiveFeedback: Number.isFinite(statsSource.positiveFeedback ?? NaN)
        ? (statsSource.positiveFeedback as number)
        : 0,
      improvements: Number.isFinite(statsSource.improvements ?? NaN)
        ? (statsSource.improvements as number)
        : 0
    },
    metadata: typeof record.metadata === 'object' && record.metadata ? record.metadata : undefined
  };
};

interface SidekickStore {
  sidekicks: AISidekick[]
  voices: Voice[]
}

const SIDEKICKS_STORAGE_KEY = 'hlai_admin_sidekicks_v1'

const isBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

const cloneVoice = (voice: Voice): Voice => ({ ...voice })

const clonePersonality = (personality: AISidekick['personality']): AISidekick['personality'] => ({
  description: personality.description,
  traits: [...personality.traits],
  preset: personality.preset
})

const deepCloneSidekick = (sidekick: AISidekick): AISidekick => ({
  ...sidekick,
  knowledgeBase: [...sidekick.knowledgeBase],
  personality: clonePersonality(sidekick.personality),
  stats: { ...sidekick.stats },
  metadata: sidekick.metadata ? { ...sidekick.metadata } : undefined
})

const updateLocalSidekick = (sidekickId: string, updater: (sidekick: AISidekick) => AISidekick): AISidekick | null => {
  const current = ensureStore()
  const match = current.sidekicks.find(sk => sk.id === sidekickId)
  if (!match) return null
  const updated = deepCloneSidekick(updater(match))
  updateStore(store => ({
    voices: store.voices.map(cloneVoice),
    sidekicks: store.sidekicks.map(sk => (sk.id === sidekickId ? updated : deepCloneSidekick(sk)))
  }))
  return updated
}

const createLocalSidekick = (payload: CreateSidekickPayload & { id?: string }): AISidekick => {
  const base: AISidekick = {
    id: payload.id || `admin-sidekick-${Date.now()}`,
    userId: resolveUserId() || 'admin',
    type: (payload.metadata?.type as string) || 'custom',
    name: payload.name,
    description: payload.description,
    color: (payload.metadata?.color as string) || '#0EA5E9',
    icon: (payload.metadata?.icon as string) || '🤖',
    voiceId: payload.voiceId,
    knowledgeBase: [],
    personality: {
      description: payload.personality.description,
      traits: [...payload.personality.traits],
      preset: payload.personality.preset
    },
    stats: { totalTraining: 0, positiveFeedback: 0, improvements: 0 },
    metadata: payload.metadata
  }
  updateStore(store => ({
    voices: store.voices.map(cloneVoice),
    sidekicks: [base, ...store.sidekicks.filter(sk => sk.id !== base.id)].map(deepCloneSidekick)
  }))
  return base
}

const DEFAULT_VOICES: Voice[] = [
  {
    id: 'nova',
    name: 'Nova — Warm & Energetic',
    openaiVoice: 'nova',
    gender: 'female',
    description: 'Friendly, upbeat guide for client-facing conversations.'
  },
  {
    id: 'verse',
    name: 'Verse — Confident & Direct',
    openaiVoice: 'verse',
    gender: 'male',
    description: 'Bold marketing voice tailored for campaigns and follow-ups.'
  },
  {
    id: 'alloy',
    name: 'Alloy — Balanced & Informative',
    openaiVoice: 'alloy',
    gender: 'neutral',
    description: 'Even, informative tone for analytics and reporting.'
  },
  {
    id: 'sol',
    name: 'Sol — Conversational Coach',
    openaiVoice: 'sol',
    gender: 'female',
    description: 'Supportive coaching cadence for training sessions and scripts.'
  }
]

const DEFAULT_SIDEKICKS: AISidekick[] = [
  {
    id: 'agent',
    userId: 'admin',
    type: 'agent',
    name: 'AI Agent',
    description: 'Your all-in-one operations partner. Handles marketing, lead follow-up, and admin tasks.',
    color: '#4F46E5',
    icon: 'smart_toy',
    voiceId: 'nova',
    knowledgeBase: [],
    personality: {
      description: 'You are the Agent’s primary Assistant. You are a world-class real estate assistant, marketer, and operations specialist.',
      traits: ['professional', 'efficient', 'all-in-one'],
      preset: 'professional'
    },
    stats: { totalTraining: 0, positiveFeedback: 0, improvements: 0 },
    metadata: { type: 'agent', color: '#4F46E5', icon: 'smart_toy' }
  },
  {
    id: 'god',
    userId: 'admin',
    type: 'god',
    name: 'God (Ops Overseer)',
    description: 'Oversees the entire platform with system-wide awareness for admins.',
    color: '#0EA5E9',
    icon: '🧠',
    voiceId: 'nova',
    knowledgeBase: [
      'Platform architecture overview and admin-only controls.',
      'Operational playbooks for incident triage and rollout readiness.',
      'Admin data governance, roles, and safety guidelines.'
    ],
    personality: {
      description:
        'You are the omniscient admin AI. Calm, precise, and directive. Provide short, actionable guidance with safety in mind.',
      traits: ['directive', 'calm', 'system-aware'],
      preset: 'professional'
    },
    stats: {
      totalTraining: 0,
      positiveFeedback: 0,
      improvements: 0
    },
    metadata: { type: 'god', color: '#0EA5E9', icon: '🧠' }
  },
  {
    id: 'sales',
    userId: 'admin',
    type: 'sales',
    name: 'Sales',
    description: 'Engages visitors and leads to book appointments and drive conversions.',
    color: '#10B981',
    icon: '💰',
    voiceId: 'sol',
    knowledgeBase: [
      'High-intent CTA scripts for booking calls and tours.',
      'Lead qualification checklist and objection handlers.',
      'Follow-up cadence for admin-owned leads.'
    ],
    personality: {
      description: 'You are the Sales AI. Persuasive, concise, and CTA-driven. Always drive to the next step.',
      traits: ['persuasive', 'concise', 'cta-driven'],
      preset: 'sales'
    },
    stats: {
      totalTraining: 0,
      positiveFeedback: 0,
      improvements: 0
    },
    metadata: { type: 'sales', color: '#10B981', icon: '💰' }
  },
  {
    id: 'support',
    userId: 'admin',
    type: 'support',
    name: 'Support',
    description: 'Handles platform issues, triage, and user help for admins.',
    color: '#6366F1',
    icon: '🛠️',
    voiceId: 'alloy',
    knowledgeBase: [
      'Runbook for common admin errors and remediation steps.',
      'Support macros for platform FAQs and incident comms.',
      'Checklist for verifying integrations and permissions.'
    ],
    personality: {
      description: 'You are the Support AI. Empathetic, clear, and step-by-step. Resolve issues and guide next actions.',
      traits: ['empathetic', 'clear', 'solution-oriented'],
      preset: 'concierge'
    },
    stats: {
      totalTraining: 0,
      positiveFeedback: 0,
      improvements: 0
    },
    metadata: { type: 'support', color: '#6366F1', icon: '🛠️' }
  },
  {
    id: 'marketing',
    userId: 'admin',
    type: 'marketing',
    name: 'Marketing',
    description: 'Drives campaigns, social posts, and growth experiments for admins.',
    color: '#F59E0B',
    icon: '📣',
    voiceId: 'verse',
    knowledgeBase: [
      'Campaign brief template for admin launches.',
      'Social + email content blocks for platform news.',
      'Positioning notes for admin-focused messaging.'
    ],
    personality: {
      description: 'You are the Marketing AI. Creative, on-brand, and conversion-focused. Ship campaigns and copy quickly.',
      traits: ['creative', 'on-brand', 'conversion-focused'],
      preset: 'creative'
    },
    stats: {
      totalTraining: 0,
      positiveFeedback: 0,
      improvements: 0
    },
    metadata: { type: 'marketing', color: '#F59E0B', icon: '📣' }
  }
]

const createDefaultStore = (): SidekickStore => ({
  sidekicks: DEFAULT_SIDEKICKS.map(deepCloneSidekick),
  voices: DEFAULT_VOICES.map(cloneVoice)
})

const readStore = (): SidekickStore => {
  if (!isBrowser()) {
    return createDefaultStore()
  }

  try {
    const raw = window.localStorage.getItem(SIDEKICKS_STORAGE_KEY)
    if (!raw) {
      return createDefaultStore()
    }

    const parsed = JSON.parse(raw) as Partial<SidekickStore>
    const voices = Array.isArray(parsed.voices)
      ? parsed.voices.map(normalizeVoice)
      : DEFAULT_VOICES.map(cloneVoice)

    const sidekicks = Array.isArray(parsed.sidekicks)
      ? parsed.sidekicks.map(normalizeSidekick)
      : DEFAULT_SIDEKICKS.map(deepCloneSidekick)

    return {
      sidekicks,
      voices
    }
  } catch (error) {
    console.warn('aiSidekicksService: failed to parse local store', error)
    return createDefaultStore()
  }
}

const writeStore = (store: SidekickStore) => {
  if (!isBrowser()) {
    return
  }

  try {
    const payload = JSON.stringify({
      sidekicks: store.sidekicks,
      voices: store.voices
    })
    window.localStorage.setItem(SIDEKICKS_STORAGE_KEY, payload)
  } catch (error) {
    console.warn('aiSidekicksService: failed to persist local store', error)
  }
}

export interface GetSidekicksOptions {
  demoMode?: boolean;
}

const ensureStore = (): SidekickStore => {
  const current = readStore()
  if (!current.sidekicks.length) {
    const defaults = createDefaultStore()
    writeStore(defaults)
    return defaults
  }
  return {
    sidekicks: current.sidekicks.map(deepCloneSidekick),
    voices: current.voices.map(cloneVoice)
  }
}

const updateStore = (updater: (store: SidekickStore) => SidekickStore): SidekickStore => {
  const current = ensureStore()
  const next = updater(current)
  writeStore(next)
  return {
    sidekicks: next.sidekicks.map(deepCloneSidekick),
    voices: next.voices.map(cloneVoice)
  }
}

export const getLocalSidekick = (id: string): AISidekick | undefined => {
  const store = ensureStore()
  return store.sidekicks.find(sidekick => sidekick.id === id)
}

export const upsertLocalSidekick = (sidekick: AISidekick): AISidekick => {
  const saved: AISidekick = deepCloneSidekick(sidekick)
  updateStore(store => ({
    voices: store.voices.map(cloneVoice),
    sidekicks: [saved, ...store.sidekicks.filter(existing => existing.id !== saved.id)].map(deepCloneSidekick)
  }))
  return saved
}

const defaultHeaders = {
  'Content-Type': 'application/json'
};

export const getSidekicks = async (
  options?: GetSidekicksOptions
): Promise<{
  sidekicks: AISidekick[];
  voices: Voice[];
}> => {
  if (options?.demoMode) {
    return ensureStore();
  }

  const userId = resolveUserId();
  const url = buildUrl('/api/sidekicks', isUuid(userId) ? { userId } : undefined);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load AI sidekicks (${response.status})`);
    }

    const data = await response.json();
    const sidekicks = Array.isArray(data?.sidekicks)
      ? data.sidekicks.map(normalizeSidekick)
      : [];
    const voices = Array.isArray(data?.voices)
      ? data.voices.map(normalizeVoice)
      : [];

    const localStore = ensureStore()

    if (sidekicks.length || voices.length) {
      writeStore({
        sidekicks: sidekicks.length ? sidekicks.map(deepCloneSidekick) : localStore.sidekicks,
        voices: voices.length ? voices.map(cloneVoice) : localStore.voices
      })
    }

    return {
      sidekicks: sidekicks.length ? sidekicks : localStore.sidekicks,
      voices: voices.length ? voices : localStore.voices
    }
  } catch (error) {
    console.warn('aiSidekicksService: falling back to demo sidekicks', error)
    return ensureStore()
  }
};

export const createSidekick = async (
  payload: CreateSidekickPayload
): Promise<AISidekick> => {
  const userId = resolveUserId();
  try {
    const response = await fetch(buildUrl('/api/sidekicks'), {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify({
        ...(isUuid(userId) ? { userId } : {}),
        ...payload
      })
    });
    if (!response.ok) {
      throw new Error(`Failed to create AI sidekick (${response.status})`);
    }
    return normalizeSidekick(await response.json());
  } catch (error) {
    console.warn('createSidekick falling back to local store', error)
    return createLocalSidekick(payload)
  }
};

export const updateSidekickPersonality = async (
  sidekickId: string,
  payload: { description: string; traits: string[]; preset: string; summary?: string }
): Promise<AISidekick> => {
  try {
    const response = await fetch(buildUrl(`/api/sidekicks/${sidekickId}/personality`), {
      method: 'PUT',
      headers: defaultHeaders,
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      throw new Error(`Failed to update personality (${response.status})`);
    }
    return normalizeSidekick(await response.json());
  } catch (error) {
    const local = updateLocalSidekick(sidekickId, sk => ({
      ...sk,
      personality: {
        description: payload.description,
        traits: [...payload.traits],
        preset: payload.preset
      }
    }))
    if (local) return local
    throw error
  }
};

export const updateSidekickVoice = async (
  sidekickId: string,
  voiceId: string
): Promise<AISidekick> => {
  try {
    const response = await fetch(buildUrl(`/api/sidekicks/${sidekickId}/voice`), {
      method: 'PUT',
      headers: defaultHeaders,
      body: JSON.stringify({ voiceId })
    });
    if (!response.ok) {
      throw new Error(`Failed to update voice (${response.status})`);
    }
    return normalizeSidekick(await response.json());
  } catch (error) {
    const local = updateLocalSidekick(sidekickId, sk => ({ ...sk, voiceId }))
    if (local) return local
    throw error
  }
};

type KnowledgeType = 'text' | 'file' | 'url';

export const addKnowledge = async (
  sidekickId: string,
  entry: { content: string; title?: string; type?: KnowledgeType }
): Promise<AISidekick> => {
  const payload = {
    content: entry.content,
    title: entry.title,
    type: entry.type
  };

  try {
    const response = await fetch(buildUrl(`/api/sidekicks/${sidekickId}/knowledge`), {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      throw new Error(`Failed to add knowledge (${response.status})`);
    }
    return normalizeSidekick(await response.json());
  } catch (error) {
    const local = updateLocalSidekick(sidekickId, sk => ({
      ...sk,
      knowledgeBase: [payload.content, ...sk.knowledgeBase].slice(0, 50)
    }))
    if (local) return local
    throw error
  }
};

export const removeKnowledge = async (
  sidekickId: string,
  index: number
): Promise<AISidekick> => {
  try {
    const response = await fetch(
      buildUrl(`/api/sidekicks/${sidekickId}/knowledge/${index}`),
      {
        method: 'DELETE'
      }
    );
    if (!response.ok) {
      throw new Error(`Failed to remove knowledge (${response.status})`);
    }
    return normalizeSidekick(await response.json());
  } catch (error) {
    const local = updateLocalSidekick(sidekickId, sk => ({
      ...sk,
      knowledgeBase: sk.knowledgeBase.filter((_, i) => i !== index)
    }))
    if (local) return local
    throw error
  }
};

export type ChatHistoryEntry = { role: 'user' | 'assistant'; content: string };

export const chatWithSidekick = async (
  sidekickId: string,
  message: string,
  history?: ChatHistoryEntry[]
): Promise<{ response: string }> => {
  const formattedHistory = Array.isArray(history)
    ? history
      .filter(
        (item): item is ChatHistoryEntry =>
          !!item &&
          (item.role === 'user' || item.role === 'assistant') &&
          typeof item.content === 'string' &&
          item.content.trim().length > 0
      )
      .map((item) => ({ role: item.role, content: item.content.trim() }))
    : undefined;

  // Sidekick chat endpoint
  const adminUrl = buildUrl(`/api/sidekicks/${sidekickId}/chat`);

  try {
    const response = await fetch(adminUrl, {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify({
        userId: resolveUserId(),
        sidekickId,
        sidekickType: sidekickId,
        message,
        history: formattedHistory
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to chat with admin sidekick (${response.status})`);
    }

    const data = await response.json();
    return {
      response:
        typeof data?.response === 'string' && data.response.trim().length > 0
          ? data.response.trim()
          : typeof data?.reply === 'string' && data.reply.trim().length > 0
            ? data.reply.trim()
            : 'I am still thinking about that. Can you provide more detail?'
    };
  } catch (error) {
    console.warn('chatWithSidekick (admin) fallback', error);
    return {
      response: `(${sidekickId} admin sidekick) ${message ? `You asked: ${message}` : 'Ready for your prompt.'}`
    };
  }
};

export const trainSidekick = async (
  sidekickId: string,
  userMessage: string,
  assistantMessage: string,
  feedback: 'positive' | 'negative'
): Promise<AISidekick | null> => {
  try {
    const response = await fetch(buildUrl(`/api/sidekicks/${sidekickId}/training`), {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify({
        userMessage,
        assistantMessage,
        feedback
      })
    });
    if (!response.ok) {
      throw new Error(`Failed to record training feedback (${response.status})`);
    }
    const data = await response.json();
    if (data?.sidekick) {
      return normalizeSidekick(data.sidekick);
    }
    return null;
  } catch (error) {
    const local = updateLocalSidekick(sidekickId, sk => ({
      ...sk,
      stats: {
        ...sk.stats,
        totalTraining: (sk.stats.totalTraining || 0) + 1,
        positiveFeedback: sk.stats.positiveFeedback + (feedback === 'positive' ? 1 : 0),
        improvements: sk.stats.improvements + (feedback === 'negative' ? 1 : 0)
      }
    }))
    return local
  }
};

export const deleteSidekick = async (sidekickId: string): Promise<void> => {
  try {
    const response = await fetch(buildUrl(`/api/sidekicks/${sidekickId}`), {
      method: 'DELETE',
      headers: defaultHeaders
    });
    if (!response.ok) {
      const message = await response.text().catch(() => '');
      throw new Error(message || `Failed to delete sidekick (${response.status})`);
    }
  } catch (error) {
    updateStore(store => ({
      voices: store.voices.map(cloneVoice),
      sidekicks: store.sidekicks.filter(sk => sk.id !== sidekickId).map(deepCloneSidekick)
    }))
  }
};
