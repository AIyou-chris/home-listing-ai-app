import { buildApiUrl } from '../../lib/api';
import { isDemoModeActive } from '../../demo/useDemoMode';
import {
  getDemoListingShareKit,
  publishDemoListingShareKit,
  createDemoTestLead
} from '../../demo/demoData';
import { emitDashboardInvalidation } from '../dashboardInvalidation';
import { resolveAgentId, defaultJsonHeaders, withAgentQuery, parseResponse } from './utils';
import type { LeadIntentLevel } from './leads';

export interface ListingSourceDefault {
  id: string | null;
  source_type: string;
  source_key: string;
}

export interface ListingShareKitResponse {
  success: boolean;
  listing_id: string;
  is_published: boolean;
  published_at: string | null;
  public_slug: string | null;
  share_url: string | null;
  qr_code_url: string | null;
  qr_code_svg: string | null;
  latest_video?: {
    id: string;
    title: string | null;
    caption: string | null;
    file_name: string | null;
    mime_type: string;
    status: string;
    created_at: string | null;
  } | null;
  source_defaults: Record<string, ListingSourceDefault>;
}

export const fetchListingShareKit = async (listingId: string, agentIdOverride?: string | null) => {
  if (isDemoModeActive()) {
    return getDemoListingShareKit(listingId);
  }

  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(
    buildApiUrl(withAgentQuery(`/api/dashboard/listings/${encodeURIComponent(listingId)}/share-kit`, agentId)),
    { headers: defaultJsonHeaders(agentId) }
  );

  // 409 = listing exists but is unpublished — return a safe draft state so the
  // Share Kit page renders the Publish button instead of crashing into an error box.
  if (response.status === 409) {
    return {
      success: false,
      listing_id: listingId,
      is_published: false,
      published_at: null,
      public_slug: null,
      share_url: null,
      qr_code_url: null,
      qr_code_svg: null,
      latest_video: null,
      source_defaults: {}
    } as ListingShareKitResponse;
  }

  return parseResponse<ListingShareKitResponse>(response);
};

export const publishListingShareKit = async (listingId: string, isPublished = true, agentIdOverride?: string | null) => {
  if (isDemoModeActive()) {
    return publishDemoListingShareKit(listingId);
  }

  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(
    buildApiUrl(withAgentQuery(`/api/dashboard/listings/${encodeURIComponent(listingId)}/publish`, agentId)),
    {
      method: 'PATCH',
      headers: defaultJsonHeaders(agentId),
      body: JSON.stringify({ is_published: isPublished, agentId })
    }
  );
  const payload = await parseResponse<ListingShareKitResponse>(response);
  emitDashboardInvalidation({
    reason: isPublished ? 'listing_published' : 'listing_unpublished',
    listingId
  });
  return payload;
};

export const generateListingQrCode = async (
  listingId: string,
  payload: {
    source_type?: string;
    source_key?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
  },
  agentIdOverride?: string | null
) => {
  if (isDemoModeActive()) {
    const shareKit = getDemoListingShareKit(listingId);
    const sourceKey = payload.source_key || payload.source_type || 'sign';
    const trackedUrl = `${shareKit.share_url || `https://homelistingai.com/l/${shareKit.public_slug || listingId}`}?src=${encodeURIComponent(sourceKey)}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(trackedUrl)}`;
    return {
      success: true,
      listing_id: listingId,
      source_key: sourceKey,
      source_type: payload.source_type || 'qr',
      share_url: shareKit.share_url || trackedUrl,
      tracked_url: trackedUrl,
      qr_code_url: qrCodeUrl,
      qr_code_svg: ''
    };
  }

  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(
    buildApiUrl(withAgentQuery(`/api/dashboard/listings/${encodeURIComponent(listingId)}/generate-qr`, agentId)),
    {
      method: 'POST',
      headers: defaultJsonHeaders(agentId),
      body: JSON.stringify({ ...payload, agentId })
    }
  );
  return parseResponse<{
    success: boolean;
    listing_id: string;
    source_key: string;
    source_type: string;
    share_url: string;
    tracked_url: string;
    qr_code_url: string;
    qr_code_svg: string;
  }>(response);
};

export const downloadOpenHouseFlyerPdf = async (listingId: string, agentIdOverride?: string | null) => {
  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const path = isDemoModeActive()
    ? `/api/demo/sharekit/listings/${encodeURIComponent(listingId)}/open-house-flyer.pdf`
    : withAgentQuery(`/api/dashboard/listings/${encodeURIComponent(listingId)}/open-house-flyer.pdf`, agentId);
  const response = await fetch(
    buildApiUrl(path),
    {
      headers: agentId ? { 'x-user-id': agentId } : undefined
    }
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    throw new Error(typeof payload.error === 'string' ? payload.error : `Request failed (${response.status})`);
  }

  return {
    blob: await response.blob(),
    fileName:
      response.headers
        .get('content-disposition')
        ?.match(/filename="([^"]+)"/i)?.[1] || `${listingId}-open-house-flyer.pdf`
  };
};

const downloadListingBinaryAsset = async (
  listingId: string,
  path: string,
  query: Record<string, string | null | undefined> = {},
  agentIdOverride?: string | null,
  options: {
    demoPath?: string;
  } = {}
) => {
  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  const queryString = params.toString();
  const resolvedPath = isDemoModeActive()
    ? `${options.demoPath || path}${queryString ? `?${queryString}` : ''}`
    : withAgentQuery(`${path}${queryString ? `?${queryString}` : ''}`, agentId);
  const response = await fetch(
    buildApiUrl(resolvedPath),
    {
      headers: agentId ? { 'x-user-id': agentId } : undefined
    }
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    throw new Error(typeof payload.error === 'string' ? payload.error : `Request failed (${response.status})`);
  }

  const contentType = String(response.headers.get('content-type') || '').trim();
  if (/text\/html/i.test(contentType)) {
    throw new Error('unexpected_html_response');
  }

  return {
    blob: await response.blob(),
    fileName:
      response.headers.get('content-disposition')?.match(/filename="([^"]+)"/i)?.[1] || `${listingId}-asset`,
    contentType: contentType || 'application/octet-stream'
  };
};

export const downloadListingQrFile = async (
  listingId: string,
  format: 'png' | 'svg',
  options: {
    sourceKey?: string | null;
    sourceType?: string | null;
  } = {},
  agentIdOverride?: string | null
) =>
  downloadListingBinaryAsset(
    listingId,
    `/api/dashboard/listings/${encodeURIComponent(listingId)}/qr.${encodeURIComponent(format)}`,
    {
      sourceKey: options.sourceKey || null,
      sourceType: options.sourceType || null
    },
    agentIdOverride,
    {
      demoPath: `/api/demo/sharekit/listings/${encodeURIComponent(listingId)}/qr.${encodeURIComponent(format)}`
    }
  );

export const downloadSignRiderPdf = async (listingId: string, agentIdOverride?: string | null) =>
  downloadListingBinaryAsset(
    listingId,
    `/api/dashboard/listings/${encodeURIComponent(listingId)}/sign-rider.pdf`,
    {},
    agentIdOverride,
    {
      demoPath: `/api/demo/sharekit/listings/${encodeURIComponent(listingId)}/sign-rider.pdf`
    }
  );

export const downloadSocialAssetPng = async (
  listingId: string,
  format: 'ig_post' | 'ig_story',
  agentIdOverride?: string | null
) =>
  downloadListingBinaryAsset(
    listingId,
    `/api/dashboard/listings/${encodeURIComponent(listingId)}/social-asset.png`,
    { format },
    agentIdOverride,
    {
      demoPath: `/api/demo/sharekit/listings/${encodeURIComponent(listingId)}/social-asset.png`
    }
  );

export const downloadPropertyReportPdf = async (listingId: string, agentIdOverride?: string | null) =>
  downloadListingBinaryAsset(
    listingId,
    `/api/dashboard/listings/${encodeURIComponent(listingId)}/property-report.pdf`,
    {},
    agentIdOverride,
    {
      demoPath: `/api/demo/sharekit/listings/${encodeURIComponent(listingId)}/property-report.pdf`
    }
  );

export const downloadFairHousingReviewPdf = async (listingId: string, agentIdOverride?: string | null) =>
  downloadListingBinaryAsset(
    listingId,
    `/api/dashboard/listings/${encodeURIComponent(listingId)}/fair-housing-review.pdf`,
    {},
    agentIdOverride,
    {
      demoPath: `/api/demo/sharekit/listings/${encodeURIComponent(listingId)}/fair-housing-review.pdf`
    }
  );

export const downloadLightCmaPdf = async (listingId: string, agentIdOverride?: string | null) =>
  downloadListingBinaryAsset(
    listingId,
    `/api/dashboard/listings/${encodeURIComponent(listingId)}/light-cma.pdf`,
    {},
    agentIdOverride,
    {
      demoPath: `/api/demo/sharekit/listings/${encodeURIComponent(listingId)}/light-cma.pdf`
    }
  );

export const sendListingTestLeadCapture = async (
  listingId: string,
  payload: {
    full_name?: string;
    email?: string;
    phone?: string;
    consent_sms?: boolean;
    context?: 'report_requested' | 'showing_requested';
    source_key?: string;
    source_type?: string;
    path_mode?: 'sign' | 'social' | 'open_house' | 'public_contact';
    source_meta?: Record<string, unknown>;
  },
  agentIdOverride?: string | null
) => {
  if (isDemoModeActive()) {
    return createDemoTestLead(listingId, payload);
  }

  const agentId = agentIdOverride === undefined ? await resolveAgentId() : agentIdOverride;
  const response = await fetch(
    buildApiUrl(withAgentQuery(`/api/dashboard/listings/${encodeURIComponent(listingId)}/test-capture`, agentId)),
    {
      method: 'POST',
      headers: defaultJsonHeaders(agentId),
      body: JSON.stringify({ ...payload, agentId })
    }
  );
  return parseResponse<{
    success: boolean;
    message: string;
    lead_id: string;
    is_deduped: boolean;
    status: string;
    intent_level: LeadIntentLevel;
    source_key: string | null;
    source_type: string;
  }>(response);
};
