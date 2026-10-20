export type StudioVideoOptions = {
  narration: 'none' | 'saved';
  voice: 'nova' | 'alloy' | 'onyx';
  voiceSpeed: '0.9' | '1' | '1.1';
  music: 'none' | 'calm' | 'upbeat' | 'upload';
  musicVolume: 'low' | 'medium';
  captionSize: 'normal' | 'large';
  videoStyle: 'blue' | 'dark';
  motion: 'gentle' | 'still';
  transition: 'fade' | 'cut';
  endCard: 'wow' | 'none';
  layout: 'cards' | 'picture' | 'explainer';
  explainer: '' | 'buyer-chat' | 'ai-phone' | 'wow-link';
};

// The animated explainer videos (drawn in code, free). Names match config/business.json.
export const EXPLAINERS: Array<{ id: Exclude<StudioVideoOptions['explainer'], ''>; label: string }> = [
  { id: 'buyer-chat', label: 'A buyer asks at night and the AI answers' },
  { id: 'ai-phone', label: 'The AI phone line catches a call' },
  { id: 'wow-link', label: 'Send one WOW Link in three steps' }
];
export const defaultVideoOptions: StudioVideoOptions = { narration: 'none', voice: 'nova', voiceSpeed: '1', music: 'none', musicVolume: 'low', captionSize: 'normal', videoStyle: 'blue', motion: 'gentle', transition: 'fade', endCard: 'wow', layout: 'cards', explainer: '' };
export const videoOptions = (campaign: Partial<StudioVideoOptions>): StudioVideoOptions => Object.fromEntries(Object.entries(defaultVideoOptions).map(([key, value]) => [key, campaign[key as keyof StudioVideoOptions] ?? value])) as StudioVideoOptions;
