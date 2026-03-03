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

const triggerAnchorDownload = (url: string, fileName: string, openInNewTab = false) => {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  if (openInNewTab) {
    anchor.target = '_blank';
  }
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  window.setTimeout(() => {
    document.body.removeChild(anchor);
  }, 0);
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
  const safeName = resolveFileName(fileName);
  const filePicker = (window as { showSaveFilePicker?: (options: unknown) => Promise<{ createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }> }> }).showSaveFilePicker;

  // Prefer native save picker when available. If it fails/cancels, keep going.
  if (typeof filePicker === 'function') {
    try {
      const response = await fetch(signedUrl, { method: 'GET' });
      if (!response.ok) {
        throw new Error(`Video fetch failed (${response.status}).`);
      }
      const blob = await response.blob();
      if (!blob.size) {
        throw new Error('Video download returned an empty file.');
      }

      const handle = await filePicker({
        suggestedName: safeName,
        types: [
          {
            description: 'MP4 Video',
            accept: { 'video/mp4': ['.mp4'] }
          }
        ]
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (error) {
      console.warn('Save picker download failed, falling back to direct download.', error);
    }
  }

  // Fallback 1: direct signed URL download.
  try {
    triggerAnchorDownload(signedUrl, safeName);
    return;
  } catch (error) {
    console.warn('Direct signed URL download failed, falling back to blob URL.', error);
  }

  // Fallback 2: blob URL download.
  try {
    const blob = await fetchVideoBlob(signedUrl);
    if (!blob.size) {
      throw new Error('Video download returned an empty file.');
    }
    const objectUrl = URL.createObjectURL(blob);
    triggerAnchorDownload(objectUrl, safeName);
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    return;
  } catch (error) {
    console.warn('Blob download fallback failed, opening video URL in a new tab.', error);
  }

  // Last resort: open in new tab so user can still save manually.
  triggerAnchorDownload(signedUrl, safeName, true);
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
    try {
      await downloadVideoFromSignedUrl(signed.signedUrl, safeFileName);
    } catch (downloadError) {
      console.error('Download fallback failed:', downloadError);
      showToast.error('Download failed. Please try Download MP4.');
    }
    return {
      signedUrl: signed.signedUrl,
      canShareFiles: false,
      mode: 'download',
      blobSize: null
    };
  }
};
