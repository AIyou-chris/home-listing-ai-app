import React, { useState } from 'react';
import { adminMarketingMediaService, type VideoReview } from '../services/adminMarketingMediaService';
import type { StudioCampaign } from '../services/adminMarketingStudioService';

type Props = { campaign: StudioCampaign; explainerChosen: boolean; unsavedChoices: boolean; disabled: boolean };

// "Does the video say what the post says?" A second AI reviewer reads the video's words next to the post and answers.
// It only answers: it makes nothing and posts nothing.
export default function MarketingVideoReview({ campaign, explainerChosen, unsavedChoices, disabled }: Props) {
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<VideoReview | null>(null);
  const [error, setError] = useState('');
  if (!explainerChosen) return null;
  async function check() {
    setBusy(true); setError(''); setReview(null);
    try { setReview(await adminMarketingMediaService.videoReview(campaign)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not check the video.'); }
    finally { setBusy(false); }
  }
  return <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3" aria-label="Video check">
    <button type="button" className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50" disabled={disabled || busy || unsavedChoices} onClick={check}>{busy ? 'Checking…' : 'Check the video says what the post says'}</button>
    {unsavedChoices && <p className="mt-2 text-xs text-slate-500">Save your video settings first.</p>}
    {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    {review && !review.reviewed && <p className="mt-2 text-sm text-slate-700">The reviewer is not available right now, so this video was not checked.</p>}
    {review?.reviewed && <div className="mt-2 text-sm text-slate-800">
      <p className={review.matches ? 'font-semibold text-emerald-700' : 'font-semibold text-amber-800'}>{review.matches ? `Matches the post (${review.score} out of 5).` : `Does not match the post yet (${review.score} out of 5).`}</p>
      {review.postMessage && <p className="mt-1"><span className="font-semibold">The post says:</span> {review.postMessage}</p>}
      {review.videoMessage && <p className="mt-1"><span className="font-semibold">The video says:</span> {review.videoMessage}</p>}
      {review.problems.length > 0 && <ul className="mt-1 list-disc pl-5">{review.problems.map(problem => <li key={problem}>{problem}</li>)}</ul>}
      {!review.matches && review.fix && <p className="mt-1"><span className="font-semibold">Suggested fix:</span> {review.fix}</p>}
    </div>}
  </div>;
}
