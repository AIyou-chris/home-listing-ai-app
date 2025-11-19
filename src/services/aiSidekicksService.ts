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

const SIDEKICKS_STORAGE_KEY = 'hlai_demo_sidekicks'

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
    id: 'demo-agent-sidekick',
    userId: 'demo-user',
    type: 'agent',
    name: 'Agent Concierge',
    description: 'Handles deal coordination, buyer updates, and daily huddles with your team.',
    color: '#8B5CF6',
    icon: '👤',
    voiceId: 'nova',
    knowledgeBase: [
      'Buyer consultation script: discovery, financing, motivation, timeline.',
      'Weekly update template summarizing showings, offers, and next steps.',
      '5-step process for coordinating inspections, appraisal, and closing tasks.'
    ],
    personality: {
      description:
        'You are the agent’s operations chief: proactive, organized, and crystal-clear with communication.',
      traits: ['proactive', 'organized', 'empathetic'],
      preset: 'professional'
    },
    stats: {
      totalTraining: 128,
      positiveFeedback: 42,
      improvements: 9
    },
    metadata: { type: 'agent', color: '#8B5CF6', icon: '👤' }
  },
  {
    id: 'demo-marketing-sidekick',
    userId: 'demo-user',
    type: 'marketing',
    name: 'Momentum Marketer',
    description: 'Builds nurture campaigns, listing launches, and social drip content on autopilot.',
    color: '#F59E0B',
    icon: '📈',
    voiceId: 'verse',
    knowledgeBase: [
      'Listing launch checklist covering teasers, reels, and email announcements.',
      '14-day warm nurture sequence for online buyer leads with AI personalization.',
      'Brand voice pillars: concierge-level, data-backed, optimistic, and tech-forward.'
    ],
    personality: {
      description: 'Energetic strategist obsessed with conversion copy and momentum.',
      traits: ['creative', 'energetic', 'conversion-focused'],
      preset: 'creative'
    },
    stats: {
      totalTraining: 94,
      positiveFeedback: 33,
      improvements: 7
    },
    metadata: { type: 'marketing', color: '#F59E0B', icon: '📈' }
  },
  {
    id: 'demo-listing-sidekick',
    userId: 'demo-user',
    type: 'listing',
    name: 'Listing Strategist',
    description: 'Produces property descriptions, pricing intel, and open house talking points.',
    color: '#EF4444',
    icon: '🏠',
    voiceId: 'alloy',
    knowledgeBase: [
      'Pricing framework: comps ± adjustments for condition, outdoor space, and views.',
      'Luxury listing adjectives cheat sheet with neighborhood callouts.',
      'Open house overview script with highlights, lifestyle angles, and CTA.'
    ],
    personality: {
      description: 'Calm, analytical expert who can translate data into persuasive narratives.',
      traits: ['analytical', 'detail-oriented', 'persuasive'],
      preset: 'analytical'
    },
    stats: {
      totalTraining: 76,
      positiveFeedback: 28,
      improvements: 5
    },
    metadata: { type: 'listing', color: '#EF4444', icon: '🏠' }
  },
  {
    id: 'demo-sales-sidekick',
    userId: 'demo-user',
    type: 'sales',
    name: 'Pipeline Coach',
    description: 'Coaches objection handling, follow-up language, and deal progression.',
    color: '#10B981',
    icon: '💼',
    voiceId: 'sol',
    knowledgeBase: [
      'Objection handler library: pricing, commission, timing, and exclusivity.',
      'Daily call blitz structure with hot/warm/cold lead rotation.',
      'Call recap template for CRM notes and next-best-action tracking.'
    ],
    personality: {
      description: 'Confident closer who keeps energy high and encourages decisive action.',
      traits: ['confident', 'results-driven', 'supportive'],
      preset: 'sales'
    },
    stats: {
      totalTraining: 54,
      positiveFeedback: 21,
      improvements: 6
    },
    metadata: { type: 'sales', color: '#10B981', icon: '💼' }
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

export const getSidekicks = async (): Promise<{
  sidekicks: AISidekick[];
  voices: Voice[];
}> => {
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
};

export const updateSidekickPersonality = async (
  sidekickId: string,
  payload: { description: string; traits: string[]; preset: string; summary?: string }
): Promise<AISidekick> => {
  const response = await fetch(buildUrl(`/api/sidekicks/${sidekickId}/personality`), {
    method: 'PUT',
    headers: defaultHeaders,
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(`Failed to update personality (${response.status})`);
  }
  return normalizeSidekick(await response.json());
};

export const updateSidekickVoice = async (
  sidekickId: string,
  voiceId: string
): Promise<AISidekick> => {
  const response = await fetch(buildUrl(`/api/sidekicks/${sidekickId}/voice`), {
    method: 'PUT',
    headers: defaultHeaders,
    body: JSON.stringify({ voiceId })
  });
  if (!response.ok) {
    throw new Error(`Failed to update voice (${response.status})`);
  }
  return normalizeSidekick(await response.json());
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

  const response = await fetch(buildUrl(`/api/sidekicks/${sidekickId}/knowledge`), {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(`Failed to add knowledge (${response.status})`);
  }
  return normalizeSidekick(await response.json());
};

export const removeKnowledge = async (
  sidekickId: string,
  index: number
): Promise<AISidekick> => {
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

  const response = await fetch(buildUrl(`/api/sidekicks/${sidekickId}/chat`), {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify({ message, history: formattedHistory })
  });
  if (!response.ok) {
    throw new Error(`Failed to chat with sidekick (${response.status})`);
  }
  const data = await response.json();
  return {
    response:
      typeof data?.response === 'string' && data.response.trim().length > 0
        ? data.response.trim()
        : 'I am still thinking about that. Can you provide more detail?'
  };
};

export const trainSidekick = async (
  sidekickId: string,
  userMessage: string,
  assistantMessage: string,
  feedback: 'positive' | 'negative'
): Promise<AISidekick | null> => {
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
};

export const deleteSidekick = async (sidekickId: string): Promise<void> => {
  const response = await fetch(buildUrl(`/api/sidekicks/${sidekickId}`), {
    method: 'DELETE',
    headers: defaultHeaders
  });
  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(message || `Failed to delete sidekick (${response.status})`);
  }
};
