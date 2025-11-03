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
  const record = raw as Partial<AISidekick> | Record<string, unknown> | undefined;

  const knowledgeBase =
    Array.isArray(record?.knowledgeBase) && record.knowledgeBase.length > 0
      ? record.knowledgeBase
          .map((entry: unknown) =>
            typeof entry === 'string' ? entry : JSON.stringify(entry)
          )
          .filter((entry: string) => entry.trim().length > 0)
      : [];

  const traits =
    Array.isArray(record?.personality?.traits) && record.personality.traits.length > 0
      ? record.personality.traits
          .map((trait: unknown) =>
            typeof trait === 'string' ? trait.trim() : ''
          )
          .filter((trait: string) => trait.length > 0)
      : [];

  const stats = record?.stats ?? {};

  return {
    id: typeof record?.id === 'string' ? record.id : '',
    userId: typeof record?.userId === 'string' ? record.userId : '',
    type: typeof record?.type === 'string' ? record.type : 'agent',
    name: typeof record?.name === 'string' ? record.name : 'AI Sidekick',
    description:
      typeof record?.description === 'string' && record.description.trim().length > 0
        ? record.description.trim()
        : 'AI assistant to support your real estate workflows.',
    color: typeof record?.color === 'string' ? record.color : '#6366F1',
    icon: typeof record?.icon === 'string' ? record.icon : '🤖',
    voiceId:
      typeof record?.voiceId === 'string' && record.voiceId.trim().length > 0
        ? record.voiceId.trim()
        : 'nova',
    knowledgeBase,
    personality: {
      description:
        typeof record?.personality?.description === 'string' &&
        record.personality.description.trim().length > 0
          ? record.personality.description.trim()
          : 'Be a proactive, trustworthy assistant who keeps communication crisp and on-brand.',
      traits,
      preset:
        typeof record?.personality?.preset === 'string' && record.personality.preset.trim().length > 0
          ? record.personality.preset.trim()
          : 'custom'
    },
    stats: {
      totalTraining: Number.isFinite(stats.totalTraining) ? stats.totalTraining : 0,
      positiveFeedback: Number.isFinite(stats.positiveFeedback) ? stats.positiveFeedback : 0,
      improvements: Number.isFinite(stats.improvements) ? stats.improvements : 0
    },
    metadata: typeof record?.metadata === 'object' && record.metadata ? record.metadata : undefined
  };
};

const defaultHeaders = {
  'Content-Type': 'application/json'
};

export const getSidekicks = async (): Promise<{
  sidekicks: AISidekick[];
  voices: Voice[];
}> => {
  const userId = resolveUserId();
  const url = buildUrl('/api/sidekicks', isUuid(userId) ? { userId } : undefined);
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
  return { sidekicks, voices };
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
