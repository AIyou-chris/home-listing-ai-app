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

const API_BASE =
  (import.meta as any)?.env?.VITE_API_BASE_URL && (import.meta as any).env.VITE_API_BASE_URL !== ''
    ? ((import.meta as any).env.VITE_API_BASE_URL as string).replace(/\/+$/, '')
    : '';

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

const normalizeVoice = (voice: any): Voice => ({
  id: typeof voice?.id === 'string' ? voice.id : 'nova',
  name: typeof voice?.name === 'string' ? voice.name : 'Nova — Warm & Energetic',
  openaiVoice: typeof voice?.openaiVoice === 'string' ? voice.openaiVoice : 'nova',
  gender:
    voice?.gender === 'male' || voice?.gender === 'female' || voice?.gender === 'neutral'
      ? voice.gender
      : 'neutral',
  description: typeof voice?.description === 'string' ? voice.description : undefined
});

const normalizeSidekick = (raw: any): AISidekick => {
  const knowledgeBase =
    Array.isArray(raw?.knowledgeBase) && raw.knowledgeBase.length > 0
      ? raw.knowledgeBase
          .map((entry: unknown) =>
            typeof entry === 'string' ? entry : JSON.stringify(entry)
          )
          .filter((entry: string) => entry.trim().length > 0)
      : [];

  const traits =
    Array.isArray(raw?.personality?.traits) && raw.personality.traits.length > 0
      ? raw.personality.traits
          .map((trait: unknown) =>
            typeof trait === 'string' ? trait.trim() : ''
          )
          .filter((trait: string) => trait.length > 0)
      : [];

  const stats = raw?.stats || {};

  return {
    id: typeof raw?.id === 'string' ? raw.id : '',
    userId: typeof raw?.userId === 'string' ? raw.userId : '',
    type: typeof raw?.type === 'string' ? raw.type : 'agent',
    name: typeof raw?.name === 'string' ? raw.name : 'AI Sidekick',
    description:
      typeof raw?.description === 'string' && raw.description.trim().length > 0
        ? raw.description.trim()
        : 'AI assistant to support your real estate workflows.',
    color: typeof raw?.color === 'string' ? raw.color : '#6366F1',
    icon: typeof raw?.icon === 'string' ? raw.icon : '🤖',
    voiceId:
      typeof raw?.voiceId === 'string' && raw.voiceId.trim().length > 0
        ? raw.voiceId.trim()
        : 'nova',
    knowledgeBase,
    personality: {
      description:
        typeof raw?.personality?.description === 'string' &&
        raw.personality.description.trim().length > 0
          ? raw.personality.description.trim()
          : 'Be a proactive, trustworthy assistant who keeps communication crisp and on-brand.',
      traits,
      preset:
        typeof raw?.personality?.preset === 'string' && raw.personality.preset.trim().length > 0
          ? raw.personality.preset.trim()
          : 'custom'
    },
    stats: {
      totalTraining: Number.isFinite(stats.totalTraining) ? stats.totalTraining : 0,
      positiveFeedback: Number.isFinite(stats.positiveFeedback) ? stats.positiveFeedback : 0,
      improvements: Number.isFinite(stats.improvements) ? stats.improvements : 0
    },
    metadata: typeof raw?.metadata === 'object' && raw.metadata ? raw.metadata : undefined
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
