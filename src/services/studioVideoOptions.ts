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
};
export const defaultVideoOptions: StudioVideoOptions = { narration: 'none', voice: 'nova', voiceSpeed: '1', music: 'none', musicVolume: 'low', captionSize: 'normal', videoStyle: 'blue', motion: 'gentle', transition: 'fade', endCard: 'wow' };
export const videoOptions = (campaign: Partial<StudioVideoOptions>): StudioVideoOptions => Object.fromEntries(Object.entries(defaultVideoOptions).map(([key, value]) => [key, campaign[key as keyof StudioVideoOptions] ?? value])) as StudioVideoOptions;
