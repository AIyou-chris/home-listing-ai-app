import { buildApiUrl } from '../lib/api';
import { authedFetch } from './authedFetch';
import type { StudioVideoOptions } from './studioVideoOptions';
import type { StudioBrief } from '../components/admin/marketingStudioDrafts';

export type CampaignOutputs = Record<'title' | 'blog' | 'emailSubject' | 'email' | 'linkedin' | 'facebook' | 'instagram' | 'bluesky' | 'videoScript' | 'imagePrompt', string>;
export type StudioCampaign = StudioBrief & Partial<StudioVideoOptions> & {
  status: 'brief' | 'generating' | 'draft' | 'approved' | 'failed';
  outputs: Partial<CampaignOutputs>;
  version: string;
  generationError?: string;
  articleSlug?: string;
  quoteCards?: string[];
};
type CampaignRow = { id: string; brief: Omit<StudioBrief, 'id' | 'createdAt'>; status: StudioCampaign['status']; outputs: Partial<CampaignOutputs>; created_at: string; updated_at: string; generation_error?: string };
const fromRow = (row: CampaignRow): StudioCampaign => ({ ...row.brief, id: row.id, createdAt: row.created_at, status: row.status, outputs: row.outputs, version: row.updated_at, generationError: row.generation_error });
async function request(path = '', method = 'GET', body?: unknown) {
  const response = await authedFetch(buildApiUrl(`/api/admin/marketing-studio/campaigns${path}`), { method, headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Marketing Studio is unavailable. Please try again.');
  return data;
}
export const adminMarketingStudioService = {
  async list(): Promise<StudioCampaign[]> { return (await request()).campaigns.map(fromRow); },
  async save(brief: StudioBrief, version?: string): Promise<StudioCampaign> { return fromRow((await request(`/${encodeURIComponent(brief.id)}`, 'PUT', { brief, version })).campaign); },
  async generate(id: string): Promise<StudioCampaign> { return fromRow((await request(`/${encodeURIComponent(id)}/generate`, 'POST', {})).campaign); },
  async edit(campaign: StudioCampaign, outputs: CampaignOutputs): Promise<StudioCampaign> { return fromRow((await request(`/${encodeURIComponent(campaign.id)}/content`, 'PATCH', { outputs, version: campaign.version })).campaign); },
  async settings(campaign: StudioCampaign, videoFormat: StudioCampaign['videoFormat'], videoDuration: StudioCampaign['videoDuration'], videoOptions?: StudioVideoOptions): Promise<StudioCampaign> { return fromRow((await request(`/${encodeURIComponent(campaign.id)}/settings`, 'PATCH', { version: campaign.version, videoFormat, videoDuration, ...(videoOptions ? { videoOptions } : {}) })).campaign); },
  async approve(campaign: StudioCampaign): Promise<StudioCampaign> { return fromRow((await request(`/${encodeURIComponent(campaign.id)}/approve`, 'POST', { version: campaign.version })).campaign); },
  async remove(campaign: StudioCampaign) { await request(`/${encodeURIComponent(campaign.id)}`, 'DELETE', { version: campaign.version }); }
};
