import { buildApiUrl } from '../lib/api';

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

