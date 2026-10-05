import { buildApiUrl } from '../lib/api';
import { authedFetch } from './authedFetch';
import type { StudioCampaign } from './adminMarketingStudioService';
export type StudioMedia = { kind: 'image' | 'video' | 'voice' | 'music'; status: 'processing' | 'ready' | 'failed'; source: 'upload' | 'template' | 'ai' | 'render'; url: string | null; stale: boolean; error?: string; updatedAt: string };
async function request(path: string, method = 'GET', body?: unknown) {
  const response = await authedFetch(buildApiUrl(`/api/admin/marketing-studio/${path}`), { method, headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Media is unavailable. Please try again.');
  return data;
}
export type MarketingImage = { id: string; campaign_id: string; group_id: string; recipe_id: string; format: string; text_zone: string; variant: number; mood: string; alt_text: string; url: string; approved: boolean; cost: number; width: number; height: number; headline?: string; settings?: { headline: string; subline: string }; checks: { problems: string[]; contrast: number; bytes: number }; used_in: { campaign_id: string; use: string }[] };
export type ImageCatalog = { recipes: { id: string; use: string; pillar: string; subject: string; mood: string }[]; formats: Record<string, { label: string; width: number; height: number }>; costs: Record<string, { set: number; one: number; final: number }> };
export type ImagePerformance = { recipe_id: string; mood: string; text_zone: string; views: number; clicks: number; engagement: number; ctr: number | null };
export const adminMarketingMediaService = {
  async imageCatalog(): Promise<ImageCatalog> { return request('image-catalog'); },
  async imageLibrary(): Promise<MarketingImage[]> { return (await request('image-library')).images; },
  async imageResults(): Promise<ImagePerformance[]> { return (await request('image-results')).scenes; },
  async loadImageSamples(): Promise<{ added: number }> { return request('image-samples','POST',{}); },
  async reviewImage(id: string, review: Record<string, boolean>): Promise<void> { await request(`image-library/${encodeURIComponent(id)}/review`,'POST',{review}); },
  async imageOptions(campaign: StudioCampaign, options: { format: string; recipeId?: string; headline: string; subline: string; imageId?: string; tweak?: string; final?: boolean; requiresLending?: boolean }): Promise<{ groupId: string; version: string }> { return request(`campaigns/${encodeURIComponent(campaign.id)}/image-options`, 'POST', { version: campaign.version, ...options }); },
  async chooseImage(campaign: StudioCampaign, imageId: string, review: Record<string, boolean>, use: string): Promise<void> { await request(`campaigns/${encodeURIComponent(campaign.id)}/image-choice`, 'POST', { version: campaign.version, imageId, review, use }); },
  async imageLayout(campaign: StudioCampaign, imageId: string, options: { format: string; headline: string; subline: string }): Promise<void> { await request(`campaigns/${encodeURIComponent(campaign.id)}/image-layout`, 'POST', { version: campaign.version, imageId, ...options }); },
  async capabilities(): Promise<{ video: boolean; picture: boolean; aiPicture: boolean; aiVoice?: boolean }> { return request('media-capabilities'); },
  async list(id: string): Promise<StudioMedia[]> { return (await request(`campaigns/${encodeURIComponent(id)}/media`)).media; },
  async picture(campaign: StudioCampaign, options: { data?: string; ai?: boolean } = {}): Promise<StudioMedia[]> { return (await request(`campaigns/${encodeURIComponent(campaign.id)}/picture`, 'POST', { version: campaign.version, ...options })).media; },
  async audio(campaign: StudioCampaign, options: { kind: 'voice' | 'music'; data?: string; ai?: boolean }): Promise<StudioMedia[]> { return (await request(`campaigns/${encodeURIComponent(campaign.id)}/audio`, 'POST', { version: campaign.version, ...options })).media; },
  async video(campaign: StudioCampaign): Promise<StudioMedia[]> { return (await request(`campaigns/${encodeURIComponent(campaign.id)}/video`, 'POST', { version: campaign.version })).media; }
};
