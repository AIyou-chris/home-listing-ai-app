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
export const adminMarketingMediaService = {
  async capabilities(): Promise<{ video: boolean; picture: boolean; aiPicture: boolean; aiVoice?: boolean }> { return request('media-capabilities'); },
  async list(id: string): Promise<StudioMedia[]> { return (await request(`campaigns/${encodeURIComponent(id)}/media`)).media; },
  async picture(campaign: StudioCampaign, options: { data?: string; ai?: boolean } = {}): Promise<StudioMedia[]> { return (await request(`campaigns/${encodeURIComponent(campaign.id)}/picture`, 'POST', { version: campaign.version, ...options })).media; },
  async audio(campaign: StudioCampaign, options: { kind: 'voice' | 'music'; data?: string; ai?: boolean }): Promise<StudioMedia[]> { return (await request(`campaigns/${encodeURIComponent(campaign.id)}/audio`, 'POST', { version: campaign.version, ...options })).media; },
  async video(campaign: StudioCampaign): Promise<StudioMedia[]> { return (await request(`campaigns/${encodeURIComponent(campaign.id)}/video`, 'POST', { version: campaign.version })).media; }
};
