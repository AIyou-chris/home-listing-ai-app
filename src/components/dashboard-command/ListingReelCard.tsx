import React, { useCallback, useEffect, useRef, useState } from 'react';
import { buildApiUrl } from '../../lib/api';
import { authHeaders } from '../../services/dashboard/utils';
import { showToast } from '../../utils/toastService';

// One tap: "Make my reel" builds a 20-second vertical video from the listing's photos,
// with a voiceover, captions and the LO's name + NMLS on the end card.

interface Props {
  listingId: string;
  photoCount: number;
  demo?: boolean;
}

type Phase = 'idle' | 'working' | 'done' | 'failed';

const ERRORS: Record<string, string> = {
  NEED_PHOTOS: 'Add at least 2 photos to this listing first.',
  NEED_NMLS: 'Add your NMLS number in Settings first. It goes on the video.',
  NOT_PUBLISHED: "This home isn't published yet.",
  NO_SHARE_LINK: "This home doesn't have a public link yet.",
  reel_rate_limited: 'You can make 5 reels an hour. Try again soon.',
  reel_unavailable: 'Reels are not available right now.'
};

const ListingReelCard: React.FC<Props> = ({ listingId, photoCount, demo }) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [url, setUrl] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const timer = useRef<number | null>(null);

  const stop = () => { if (timer.current) { window.clearInterval(timer.current); timer.current = null; } };
  useEffect(() => stop, []);

  const poll = useCallback((jobId: string) => {
    stop();
    let misses = 0;
    timer.current = window.setInterval(async () => {
      try {
        const res = await fetch(buildApiUrl(`/api/lo/listings/${listingId}/reel/${jobId}`), { headers: await authHeaders(null) });
        const data = await res.json().catch(() => ({}));
        if (res.status === 404) { stop(); setPhase('failed'); setMessage('That video was lost. Tap to try again.'); return; }
        if (!res.ok) { if (++misses > 5) { stop(); setPhase('failed'); setMessage('Could not check on your video. Try again.'); } return; }
        setProgress(Number(data.progress) || 0);
        if (data.status === 'done' && data.url) { stop(); setUrl(data.url); setPhase('done'); }
        if (data.status === 'failed') { stop(); setPhase('failed'); setMessage('The video did not finish. Tap to try again.'); }
      } catch { if (++misses > 5) { stop(); setPhase('failed'); setMessage('Could not check on your video. Try again.'); } }
    }, 2500);
  }, [listingId]);

  const make = async () => {
    if (demo) { showToast.error('Reels are real on your own listings.'); return; }
    setPhase('working'); setProgress(3); setMessage(''); setUrl(null);
    try {
      const res = await fetch(buildApiUrl(`/api/lo/listings/${listingId}/reel`), { method: 'POST', headers: await authHeaders(null), body: '{}' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.jobId) { setPhase('failed'); setMessage(ERRORS[data.error] || 'Could not start your video. Try again.'); return; }
      poll(data.jobId);
    } catch { setPhase('failed'); setMessage('Could not start your video. Try again.'); }
  };

  const tooFew = photoCount < 2;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3">
        <h2 className="text-base font-bold text-slate-900">🎬 Video reel</h2>
        <p className="text-sm text-slate-500">A 20-second vertical video from this home's photos, with a voiceover. Post it on Instagram, Facebook or TikTok.</p>
      </div>

      {phase === 'done' && url ? (
        <div className="flex flex-wrap items-start gap-4">
          <video src={url} controls playsInline className="w-44 rounded-lg border border-slate-200 bg-black" aria-label="Your listing reel" />
          <div className="flex flex-col gap-2">
            <a href={url} download={`reel-${listingId}.mp4`} target="_blank" rel="noreferrer" className="rounded-lg bg-primary-600 px-4 py-2 text-center text-sm font-bold text-white hover:bg-primary-700">Download video</a>
            <button type="button" onClick={() => void make()} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Make a new one</button>
            <p className="max-w-[16rem] text-xs text-slate-400">The voice is AI-generated, and the video says so. Posting it is up to you.</p>
          </div>
        </div>
      ) : phase === 'working' ? (
        <div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-primary-600 transition-all" style={{ width: `${Math.max(5, progress)}%` }} /></div>
          <p className="mt-2 text-sm text-slate-500">Making your video. This takes about a minute. You can stay on this page.</p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => void make()} disabled={tooFew && !demo} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-40">{phase === 'failed' ? 'Try again' : 'Make my reel'}</button>
          {tooFew && !demo && <span className="text-sm text-amber-700">Add at least 2 photos to this listing first.</span>}
          {message && <span className="text-sm text-amber-700">{message}</span>}
        </div>
      )}
    </section>
  );
};

export default ListingReelCard;
