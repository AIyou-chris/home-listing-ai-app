const OPENAI_VOICE_ALIASES: Record<string, 'nova' | 'shimmer' | 'echo' | 'alloy' | 'onyx' | 'fable'> = {
  nova: 'nova',
  'nova-voice': 'nova',
  shimmer: 'shimmer',
  echo: 'echo',
  alloy: 'alloy',
  onyx: 'onyx',
  fable: 'fable'
};

/**
 * Normalizes a UI voice identifier to a valid OpenAI voice id.
 */
export const normalizeOpenAIVoice = (
  voiceId?: string | null
): 'nova' | 'shimmer' | 'echo' | 'alloy' | 'onyx' | 'fable' => {
  if (!voiceId || typeof voiceId !== 'string') return 'nova';
  const trimmed = voiceId.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (trimmed in OPENAI_VOICE_ALIASES) {
    return OPENAI_VOICE_ALIASES[trimmed];
  }
  const fallback = trimmed.split('-')[0];
  if (fallback in OPENAI_VOICE_ALIASES) {
    return OPENAI_VOICE_ALIASES[fallback];
  }
  return 'nova';
};
