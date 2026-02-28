import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../services/supabase';
import { showToast } from '../../utils/toastService';
import {
  canShareFiles,
  downloadVideoFromSignedUrl,
  fetchVideoBlob,
  getVideoSignedUrl,
  isNativeShareAvailable,
  shareVideo
} from '../../services/videoShareService';

const ShareTestPage: React.FC = () => {
  const [videoId, setVideoId] = useState('');
  const [signedUrl, setSignedUrl] = useState('');
  const [listingLink, setListingLink] = useState('https://homelistingai.com/l/demo');
  const [captionText, setCaptionText] = useState('Just listed. Get the report + showing options.');
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [result, setResult] = useState<{
    fetchStatus: 'idle' | 'ok' | 'failed';
    blobSize: number | null;
    canShareFiles: boolean | null;
    error: string | null;
  }>({
    fetchStatus: 'idle',
    blobSize: null,
    canShareFiles: null,
    error: null
  });

  const devToolsFlag = useMemo(() => {
    if (import.meta.env.VITE_DEV_TOOLS === 'true') return true;
    return import.meta.env.DEV === true;
  }, []);

  useEffect(() => {
    let mounted = true;
    const checkAccess = async () => {
      if (devToolsFlag) {
        if (mounted) setIsAuthorized(true);
        return;
      }
      try {
        const adminEmail = String(import.meta.env.VITE_ADMIN_EMAIL || '').trim().toLowerCase();
        const { data } = await supabase.auth.getUser();
        const userEmail = String(data.user?.email || '').trim().toLowerCase();
        if (mounted) setIsAuthorized(Boolean(adminEmail && userEmail && adminEmail === userEmail));
      } catch {
        if (mounted) setIsAuthorized(false);
      }
    };
    void checkAccess();
    return () => {
      mounted = false;
    };
  }, [devToolsFlag]);

  const resetError = () =>
    setResult((prev) => ({
      ...prev,
      error: null
    }));

  const handleGetSignedUrl = async () => {
    if (!videoId.trim()) {
      showToast.error('Video ID is required.');
      return;
    }
    setIsLoading(true);
    resetError();
    try {
      const signed = await getVideoSignedUrl(videoId.trim(), 1800);
      setSignedUrl(signed.signedUrl);
      showToast.success('Signed URL loaded.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get signed URL.';
      setResult((prev) => ({ ...prev, error: message }));
      showToast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchCorsTest = async () => {
    if (!signedUrl.trim()) {
      showToast.error('Get a signed URL first.');
      return;
    }
    setIsLoading(true);
    resetError();
    try {
      const blob = await fetchVideoBlob(signedUrl.trim());
      const file = new File([blob], 'smoke-test.mp4', { type: 'video/mp4' });
      setResult({
        fetchStatus: 'ok',
        blobSize: blob.size,
        canShareFiles: canShareFiles(file),
        error: null
      });
      showToast.success('Fetch ok.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Fetch failed.';
      setResult({
        fetchStatus: 'failed',
        blobSize: null,
        canShareFiles: null,
        error: message
      });
      showToast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShareFile = async () => {
    if (!videoId.trim()) {
      showToast.error('Video ID is required.');
      return;
    }
    setIsLoading(true);
    resetError();
    try {
      await shareVideo({
        videoId: videoId.trim(),
        captionText,
        listingLink,
        title: 'Listing video',
        fileName: `${videoId.trim()}.mp4`
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Share failed.';
      setResult((prev) => ({ ...prev, error: message }));
      showToast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShareTextOnly = async () => {
    if (!isNativeShareAvailable()) {
      showToast.error('Native share is not available on this device.');
      return;
    }
    setIsLoading(true);
    resetError();
    try {
      await navigator.share({
        title: 'Listing video',
        text: `${captionText}\n${listingLink}`
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Text share failed.';
      setResult((prev) => ({ ...prev, error: message }));
      showToast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!signedUrl.trim()) {
      showToast.error('Get a signed URL first.');
      return;
    }
    setIsLoading(true);
    try {
      await downloadVideoFromSignedUrl(signedUrl.trim(), `${videoId.trim() || 'listing-video'}.mp4`);
      showToast.success('Downloaded');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Download failed.';
      setResult((prev) => ({ ...prev, error: message }));
      showToast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Dev share test is restricted. Use admin account or set <code>VITE_DEV_TOOLS=true</code>.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 md:px-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h1 className="text-xl font-bold text-slate-900">PWA Share Test</h1>
        <p className="mt-1 text-sm text-slate-500">Smoke-test signed URL, CORS fetch, and native sharing.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <label className="text-sm font-semibold text-slate-700">
          Video ID
          <input
            value={videoId}
            onChange={(event) => setVideoId(event.target.value)}
            placeholder="uuid"
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void handleGetSignedUrl()}
            disabled={isLoading}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Get signed URL
          </button>
          <button
            type="button"
            onClick={() => void handleFetchCorsTest()}
            disabled={isLoading || !signedUrl}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
          >
            Fetch MP4 (CORS test)
          </button>
          <button
            type="button"
            onClick={() => void handleShareFile()}
            disabled={isLoading}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
          >
            Share file
          </button>
          <button
            type="button"
            onClick={() => void handleShareTextOnly()}
            disabled={isLoading}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
          >
            Share text only
          </button>
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={isLoading || !signedUrl}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
          >
            Download MP4
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <label className="text-sm font-semibold text-slate-700">
          Signed URL
          <textarea
            readOnly
            value={signedUrl}
            rows={4}
            className="mt-2 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-700"
          />
        </label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            Caption
            <textarea
              value={captionText}
              onChange={(event) => setCaptionText(event.target.value)}
              rows={2}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Listing link
            <input
              value={listingLink}
              onChange={(event) => setListingLink(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
        <p><span className="font-semibold">fetch:</span> {result.fetchStatus}</p>
        <p><span className="font-semibold">blob size:</span> {result.blobSize ?? '-'}</p>
        <p><span className="font-semibold">canShare(files):</span> {result.canShareFiles === null ? '-' : String(result.canShareFiles)}</p>
        <p><span className="font-semibold">error:</span> {result.error || '-'}</p>
      </div>
    </div>
  );
};

export default ShareTestPage;
