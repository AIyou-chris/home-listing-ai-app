import React, { useState } from 'react';
import { buildApiUrl } from '../../lib/api';
import { authHeaders } from '../../services/dashboard/utils';
import { showToast } from '../../utils/toastService';

// One tap: "Make my Ask-the-AI video" draws a 20-second chat video for this home
// (a buyer asks, the AI answers from the listing's facts, the lead goes to the loan officer).
// Free to make for the loan officer. The AI writes the chat from the home's real facts and a voice reads it.

interface Props {
  listingId: string;
  demo?: boolean;
}

const POLL_MS = 3000;

const EXPLAINER_ERRORS: Record<string, string> = {
  NEED_NMLS: 'Add your NMLS number in Settings first. It goes on the video.',
  NEED_LO_NAME: 'Add your name in Settings first. It goes on the video.',
  NOT_PUBLISHED: "This home isn't published yet.",
  NO_SHARE_LINK: "This home doesn't have a public link yet.",
  video_in_progress: 'Your video is still being made. Give it a minute.',
  video_rate_limited: 'You can make 5 of these an hour. Try again soon.',
  video_unavailable: 'This video is not available right now.',
  listing_access_denied: 'This home is not assigned to you.'
};

const ListingExplainerCard: React.FC<Props> = ({ listingId, demo }) => {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [variant, setVariant] = useState(0);

  const make = async (nextVariant: number) => {
    if (demo) { showToast.error('This video is real on your own listings.'); return; }
    setBusy(true); setMessage('');
    try {
      const res = await fetch(buildApiUrl(`/api/lo/listings/${listingId}/explainer`), {
        method: 'POST', headers: { ...(await authHeaders(null)), 'Content-Type': 'application/json' }, body: JSON.stringify({ variant: nextVariant })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.jobId) { setMessage(EXPLAINER_ERRORS[data.error] || 'Could not make your video. Try again.'); return; }
      // The video takes a minute, longer than the web proxy waits, so it is made in the background and asked for every few seconds.
      for (let i = 0; i < 60; i += 1) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        const poll = await fetch(buildApiUrl(`/api/lo/listings/${listingId}/explainer/${data.jobId}`), { headers: await authHeaders(null) });
        const job = await poll.json().catch(() => ({}));
        if (poll.ok && job.status === 'ready' && job.url) { setUrl(job.url); setVariant(nextVariant); return; }
        if (!poll.ok || job.status === 'failed') { setMessage(EXPLAINER_ERRORS[job.error] || 'Could not make your video. Try again.'); return; }
      }
      setMessage('This is taking longer than usual. Try again in a minute.');
    } catch { setMessage('Could not make your video. Try again.'); } finally { setBusy(false); }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3">
        <h2 className="text-base font-bold text-slate-900">💬 "Ask the AI" video</h2>
        <p className="text-sm text-slate-500">A 20-second video of a buyer asking about this home and the AI answering, with your name and NMLS at the end. Free to make. Post it on Instagram, Facebook or TikTok.</p>
      </div>
      {url ? (
        <div className="flex flex-wrap items-start gap-4">
          <video src={url} controls playsInline className="w-44 rounded-lg border border-slate-200 bg-black" aria-label="Your Ask the AI video" />
          <div className="flex flex-col gap-2">
            <a href={url} download={`ask-the-ai-${listingId}.mp4`} target="_blank" rel="noreferrer" className="rounded-lg bg-primary-600 px-4 py-2 text-center text-sm font-bold text-white hover:bg-primary-700">Download</a>
            <button type="button" disabled={busy} onClick={() => void make(variant + 1)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{busy ? 'Making…' : 'Try a different question'}</button>
            <p className="max-w-[16rem] text-xs text-slate-400">The chat is an example and the video says so. Posting it is up to you.</p>
            {message && <p className="text-sm text-amber-700">{message}</p>}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => void make(0)} disabled={busy} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50">{busy ? 'Making your video…' : 'Make my video'}</button>
          {message && <span className="text-sm text-amber-700">{message}</span>}
        </div>
      )}
    </section>
  );
};

export default ListingExplainerCard;
