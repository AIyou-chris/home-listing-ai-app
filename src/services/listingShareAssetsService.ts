import { buildApiUrl } from '../lib/api';
import {
  downloadFairHousingReviewPdf,
  downloadLightCmaPdf,
  downloadListingQrFile,
  downloadOpenHouseFlyerPdf,
  downloadPropertyReportPdf,
  downloadSignRiderPdf,
  downloadSocialAssetPng,
  fetchListingShareKit
} from './dashboardCommandService';

type FlyerType =
  | 'open_house'
  | 'sign'
  | 'property_report'
  | 'fair_housing_review'
  | 'light_cma';

type QrDestination = 'sign' | 'open_house' | 'social';
type SocialAssetFormat = 'ig_post' | 'ig_story';

const extractContentDispositionFilename = (value: string | null, fallback: string) => {
  const match = value?.match(/filename="([^"]+)"/i)?.[1];
  return match || fallback;
};

export const downloadBlobResponse = async (response: Response, fallbackFileName: string) => {
  const contentType = String(response.headers.get('content-type') || '').trim();

  if (!response.ok) {
    const payload = (await response.json().catch(async () => ({ error: await response.text().catch(() => '') }))) as {
      error?: string;
    };
    throw new Error(payload.error || `request_failed_${response.status}`);
  }

  if (/text\/html/i.test(contentType)) {
    throw new Error('unexpected_html_response');
  }

  return {
    blob: await response.blob(),
    fileName: extractContentDispositionFilename(response.headers.get('content-disposition'), fallbackFileName),
    contentType: contentType || 'application/octet-stream'
  };
};

export const saveBlobDownload = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const copyToClipboard = async (text: string) => {
  const value = String(text || '');
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  const copied = document.execCommand('copy');
  document.body.removeChild(textarea);
  if (!copied) {
    throw new Error('clipboard_unavailable');
  }
};

export const openInNewTab = (url: string) => {
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  return Boolean(opened);
};

export const buildPublicListingUrl = (
  publicSlug: string,
  options: {
    demo?: boolean;
    action?: 'chat' | 'contact';
  } = {}
) => {
  const safeSlug = encodeURIComponent(String(publicSlug || '').trim());
  const path = options.demo ? `/demo-live/${safeSlug}` : `/l/${safeSlug}`;
  const url = new URL(path, window.location.origin);
  if (options.action) {
    url.searchParams.set('action', options.action);
  }
  return url.toString();
};

export const buildPublicFlyerUrl = (options: {
  publicSlug: string;
  listingId?: string | null;
  demo?: boolean;
}) => {
  if (options.demo) {
    const listingId = String(options.listingId || '').trim();
    if (!listingId) return '';
    return buildApiUrl(`/api/demo/sharekit/listings/${encodeURIComponent(listingId)}/open-house-flyer.pdf`);
  }

  const safeSlug = String(options.publicSlug || '').trim();
  if (!safeSlug) return '';
  return buildApiUrl(`/api/public/listings/${encodeURIComponent(safeSlug)}/open-house-flyer.pdf`);
};

export const listingShareKitService = {
  getShareKit: fetchListingShareKit,
  getQrPng: (listingId: string, destination: QrDestination) =>
    downloadListingQrFile(listingId, 'png', { sourceKey: destination, sourceType: destination === 'sign' ? 'qr' : destination }),
  getQrSvg: (listingId: string, destination: QrDestination) =>
    downloadListingQrFile(listingId, 'svg', { sourceKey: destination, sourceType: destination === 'sign' ? 'qr' : destination }),
  getFlyerPdf: (listingId: string, type: FlyerType) => {
    if (type === 'open_house') return downloadOpenHouseFlyerPdf(listingId);
    if (type === 'sign') return downloadSignRiderPdf(listingId);
    if (type === 'property_report') return downloadPropertyReportPdf(listingId);
    if (type === 'fair_housing_review') return downloadFairHousingReviewPdf(listingId);
    return downloadLightCmaPdf(listingId);
  },
  getSocialAsset: (listingId: string, format: SocialAssetFormat) => downloadSocialAssetPng(listingId, format),
  copyShareUrl: copyToClipboard,
  openPublicListing: (publicSlug: string, options?: { demo?: boolean; action?: 'chat' | 'contact' }) =>
    openInNewTab(buildPublicListingUrl(publicSlug, options)),
  buildPublicFlyerUrl,
  saveBlobDownload
};

