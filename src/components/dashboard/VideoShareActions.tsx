import React, { useMemo, useState } from 'react';
import { showToast } from '../../utils/toastService';
import {
  downloadVideoFromSignedUrl,
  getVideoSignedUrl,
  isNativeShareAvailable,
  shareVideo
} from '../../services/videoShareService';

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

const VideoShareActions: React.FC<VideoShareActionsProps> = ({ videoId, fileName, captionText, listingLink }) => {
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const canNativeShare = useMemo(() => {
    return isNativeShareAvailable() && isLikelyMobileDevice();
  }, []);

  const resolvedFileName = useMemo(() => {
    const safe = (fileName || '').trim();
    return safe || 'listing-video.mp4';
  }, [fileName]);

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const signed = await getVideoSignedUrl(videoId, 1800);
      await downloadVideoFromSignedUrl(signed.signedUrl, resolvedFileName);
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
      await shareVideo({
        videoId,
        captionText,
        listingLink,
        title: 'Listing video',
        fileName: resolvedFileName
      });
    } catch (error) {
      console.error('Native share failed', error);
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
