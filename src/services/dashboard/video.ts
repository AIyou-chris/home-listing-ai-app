import { buildApiUrl } from '../../lib/api';
import { isDemoModeActive } from '../../demo/useDemoMode';
import {
  getDemoVideoById,
  generateDemoListingVideo,
  setDemoListingVideoScenario
} from '../../demo/demoData';
import { resolveAgentId, defaultJsonHeaders, withAgentQuery, parseResponse, parseVideoResponse } from './utils';

export const fetchDashboardVideoSignedUrl = async (
  videoId: string,
  expiresIn = 1800,
  agentIdOverride?: string | null
) => {
  if (isDemoModeActive()) {
    const video = getDemoVideoById(videoId);
    if (!video?.video_url) {
      throw new Error('Video is still processing.');
    }
    return {
      signedUrl: video.video_url,
      expiresIn,
      fileName: video.file_name,
      mimeType: video.mime_type
    };
  }

  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const path = withAgentQuery(
    `/api/dashboard/videos/${encodeURIComponent(videoId)}/signed-url?expiresIn=${encodeURIComponent(String(expiresIn))}`,
    agentId
  );
  const response = await fetch(buildApiUrl(path), {
    headers: defaultJsonHeaders(agentId)
  });
  return parseResponse<{
    signedUrl: string;
    expiresIn: number;
    fileName: string;
    mimeType: string;
  }>(response);
};

export const fetchListingVideos = async (listingId: string, agentIdOverride?: string | null) => {
  if (isDemoModeActive()) {
    const { getDemoListingVideos } = await import('../../demo/demoData');
    return getDemoListingVideos(listingId);
  }

  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(buildApiUrl(withAgentQuery(`/api/dashboard/listings/${encodeURIComponent(listingId)}/videos`, agentId)), {
    headers: defaultJsonHeaders(agentId)
  });
  return parseVideoResponse<{
    credits_remaining: number;
    credits_total?: number;
    credits_used?: number;
    limit?: number;
    used?: number;
    remaining?: number;
    scenario?: 'normal' | 'limit_reached' | 'failed_render';
    videos: Array<{
      id: string;
      status: string;
      template_style?: string | null;
      title?: string | null;
      caption?: string | null;
      file_name?: string | null;
      mime_type?: string | null;
      video_url?: string | null;
      error_message?: string | null;
      created_at?: string | null;
      updated_at?: string | null;
      source_photos?: string[] | null;
    }>;
  }>(response);
};

export const fetchDashboardVideoStatus = async (videoId: string, agentIdOverride?: string | null) => {
  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(
    buildApiUrl(withAgentQuery(`/api/dashboard/videos/${encodeURIComponent(videoId)}/status`, agentId)),
    { headers: defaultJsonHeaders(agentId) }
  );

  return parseVideoResponse<{
    video_id: string;
    status: string;
    stage?: 'ffmpeg_rendering' | 'rendering' | 'finalizing' | 'failed' | string;
    error_message?: string | null;
  }>(response);
};

export const fetchListingVideoCredits = async (listingId: string, agentIdOverride?: string | null) => {
  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(
    buildApiUrl(withAgentQuery(`/api/dashboard/video-credits/${encodeURIComponent(listingId)}`, agentId)),
    { headers: defaultJsonHeaders(agentId) }
  );

  return parseResponse<{
    listing_id: string;
    remaining: number;
    limit: number;
    used: number;
    included?: number;
    extra?: number;
  }>(response);
};

export const addFreeTestVideoCredits = async (
  listingId: string,
  add = 3,
  agentIdOverride?: string | null
) => {
  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(
    buildApiUrl(withAgentQuery('/api/dashboard/video-credits/free-test', agentId)),
    {
      method: 'POST',
      headers: defaultJsonHeaders(agentId),
      body: JSON.stringify({ listing_id: listingId, add })
    }
  );

  return parseResponse<{
    ok: boolean;
    listing_id: string;
    added: number;
    remaining: number;
  }>(response);
};

export const generateListingVideo = async (
  listingId: string,
  payload: { template_style: string },
  agentIdOverride?: string | null
) => {
  if (isDemoModeActive()) {
    const result = generateDemoListingVideo(listingId, payload.template_style);
    if (!result.queued) {
      throw new Error(result.error || 'Failed to generate video.');
    }
    return {
      success: true,
      status: 'queued',
      credits_remaining: result.credits_remaining,
      video: result.video || null
    };
  }

  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(buildApiUrl(withAgentQuery(`/api/dashboard/listings/${encodeURIComponent(listingId)}/videos/generate`, agentId)), {
    method: 'POST',
    headers: defaultJsonHeaders(agentId),
    body: JSON.stringify(payload)
  });
  return parseVideoResponse<{
    success: boolean;
    video_id?: string;
    status?: string;
    credits_remaining?: number;
    video?: Record<string, unknown> | null;
  }>(response);
};

export const addDevListingVideoCredits = async (
  listingId: string,
  count = 3,
  agentIdOverride?: string | null
) => {
  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(
    buildApiUrl(withAgentQuery(`/api/dev/listings/${encodeURIComponent(listingId)}/videos/credits/add`, agentId)),
    {
      method: 'POST',
      headers: defaultJsonHeaders(agentId),
      body: JSON.stringify({ count })
    }
  );
  return parseResponse<{
    success: boolean;
    listing_id: string;
    added: number;
    credits: {
      included: number;
      extra: number;
      used: number;
      remaining: number;
    };
  }>(response);
};

export const updateDemoVideoScenario = async (listingId: string, scenario: 'normal' | 'limit_reached' | 'failed_render') => {
  if (!isDemoModeActive()) return;
  setDemoListingVideoScenario(listingId, scenario);
};
