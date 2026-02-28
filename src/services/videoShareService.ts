import { fetchDashboardVideoSignedUrl } from './dashboardCommandService';
import { showToast } from '../utils/toastService';

export interface ShareVideoInput {
  videoId: string;
  captionText: string;
  listingLink: string;
  title?: string;
  fileName?: string;
}

export interface ShareVideoResult {
  signedUrl: string;
  canShareFiles: boolean;
  mode: 'file' | 'text' | 'download';
  blobSize: number | null;
}

const resolveFileName = (raw?: string) => {
  const value = String(raw || '').trim();
  return value || 'listing-video.mp4';
};

export const isNativeShareAvailable = () =>
  typeof navigator !== 'undefined' && typeof navigator.share === 'function';

export const canShareFiles = (file: File) =>
  typeof navigator !== 'undefined' &&
  typeof navigator.canShare === 'function' &&
  navigator.canShare({ files: [file] });

export const getVideoSignedUrl = async (videoId: string, expiresIn = 1800) => {
  const payload = await fetchDashboardVideoSignedUrl(videoId, expiresIn);
  if (!payload?.signedUrl) {
    throw new Error('Missing signed URL.');
  }
  return payload;
};

export const fetchVideoBlob = async (signedUrl: string) => {
  const response = await fetch(signedUrl, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`Video fetch failed (${response.status}).`);
  }
  const blob = await response.blob();
  return blob;
};

export const downloadVideoFromSignedUrl = async (signedUrl: string, fileName: string) => {
  const anchor = document.createElement('a');
  anchor.href = signedUrl;
  anchor.download = resolveFileName(fileName);
  anchor.rel = 'noopener';
  anchor.target = '_blank';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
};

export const shareVideo = async ({ videoId, captionText, listingLink, title = 'Listing video', fileName }: ShareVideoInput): Promise<ShareVideoResult> => {
  const signed = await getVideoSignedUrl(videoId, 1800);
  const safeFileName = resolveFileName(fileName || signed.fileName);

  if (!isNativeShareAvailable()) {
    await downloadVideoFromSignedUrl(signed.signedUrl, safeFileName);
    return {
      signedUrl: signed.signedUrl,
      canShareFiles: false,
      mode: 'download',
      blobSize: null
    };
  }

  try {
    const blob = await fetchVideoBlob(signed.signedUrl);
    const file = new File([blob], safeFileName, { type: 'video/mp4' });
    const fileShareSupported = canShareFiles(file);

    if (fileShareSupported) {
      await navigator.share({
        files: [file],
        text: captionText,
        title
      });
      return {
        signedUrl: signed.signedUrl,
        canShareFiles: true,
        mode: 'file',
        blobSize: blob.size
      };
    }

    await navigator.share({
      text: `${captionText}\n${listingLink}`,
      title
    });

    return {
      signedUrl: signed.signedUrl,
      canShareFiles: false,
      mode: 'text',
      blobSize: blob.size
    };
  } catch (error) {
    console.error('shareVideo fallback to download:', error);
    showToast.error('Couldn’t share — downloading instead');
    await downloadVideoFromSignedUrl(signed.signedUrl, safeFileName);
    return {
      signedUrl: signed.signedUrl,
      canShareFiles: false,
      mode: 'download',
      blobSize: null
    };
  }
};
