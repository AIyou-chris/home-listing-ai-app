import React, { useMemo, useState } from 'react';
import { fetchDashboardVideoSignedUrl } from '../../services/dashboardCommandService';
import { showToast } from '../../utils/toastService';

interface VideoShareActionsProps {
  videoId: string;
  fileName?: string | null;
  captionText: string;
  listingLink: string;
}

const isLikelyMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  const coarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches;
  if (coarsePointer) return true;
  const ua = window.navigator?.userAgent || '';
  return /android|iphone|ipad|ipod|mobile/i.test(ua);
};

const downloadFromSignedUrl = async (signedUrl: string, fileName: string) => {
  const anchor = document.createElement('a');
  anchor.href = signedUrl;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  anchor.target = '_blank';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
};

const VideoShareActions: React.FC<VideoShareActionsProps> = ({ videoId, fileName, captionText, listingLink }) => {
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const canNativeShare = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return typeof navigator.share === 'function' && isLikelyMobileDevice();
  }, []);

  const resolvedFileName = useMemo(() => {
    const safe = (fileName || '').trim();
    return safe || 'listing-video.mp4';
  }, [fileName]);

  const getSignedVideo = async () => {
    const payload = await fetchDashboardVideoSignedUrl(videoId, 1800);
    if (!payload?.signedUrl) {
      throw new Error('Missing signed URL for video');
    }
    return payload;
  };

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const signed = await getSignedVideo();
      await downloadFromSignedUrl(signed.signedUrl, resolvedFileName);
      showToast.success('Downloaded');
    } catch (error) {
      console.error('Failed to download video', error);
      showToast.error('Could not download video.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyCaption = async () => {
    if (isCopying) return;
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(captionText);
      showToast.success('Copied');
    } catch (error) {
      console.error('Failed to copy caption', error);
      showToast.error('Could not copy caption.');
    } finally {
      setIsCopying(false);
    }
  };

  const handleShare = async () => {
    if (!canNativeShare || isSharing) return;
    setIsSharing(true);
    try {
      const signed = await getSignedVideo();
      const response = await fetch(signed.signedUrl);
      if (!response.ok) {
        throw new Error(`Video fetch failed (${response.status})`);
      }
      const blob = await response.blob();
      const mp4File = new File([blob], resolvedFileName, { type: 'video/mp4' });

      const canShareFiles =
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [mp4File] });

      if (canShareFiles) {
        await navigator.share({
          files: [mp4File],
          text: captionText,
          title: 'Listing video'
        });
      } else {
        await navigator.share({
          text: `${captionText}\n${listingLink}`,
          title: 'Listing video'
        });
      }
    } catch (error) {
      console.error('Native share failed; falling back to download', error);
      showToast.error('Couldn’t share — downloading instead');
      try {
        const signed = await getSignedVideo();
        await downloadFromSignedUrl(signed.signedUrl, resolvedFileName);
      } catch (downloadError) {
        console.error('Fallback download failed', downloadError);
      }
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {canNativeShare ? (
        <button
          type="button"
          onClick={() => void handleShare()}
          disabled={isSharing}
          className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-700 disabled:opacity-60"
        >
          {isSharing ? 'Sharing...' : 'Share'}
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => void handleDownload()}
        disabled={isDownloading}
        className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-700 disabled:opacity-60"
      >
        {isDownloading ? 'Downloading...' : 'Download MP4'}
      </button>
      <button
        type="button"
        onClick={() => void handleCopyCaption()}
        disabled={isCopying}
        className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-700 disabled:opacity-60"
      >
        {isCopying ? 'Copying...' : 'Copy caption'}
      </button>
    </div>
  );
};

export default VideoShareActions;
