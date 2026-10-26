import React, { useState } from 'react';
import type { StudioCampaign } from '../services/adminMarketingStudioService';
import type { StudioMedia } from '../services/adminMarketingMediaService';

// The animated video, the recommended way: the AI writes every word from this campaign's post and video script, a voice reads it,
// and a second AI checks it says what the post says. Pick a scene (or let it pick), say what it should show, press the button.

const button = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-primary-500';

type Props = {
  campaign: StudioCampaign;
  video?: StudioMedia;
  scenes: Array<{ name: string; label: string }>;
  making: boolean;
  disabled: boolean;
  onMake: (scene: string, note: string) => void;
  onRate: (rating: 'up' | 'down', reason: string) => void;
};

export default function StudioExplainer({ campaign, video, scenes, making, disabled, onMake, onRate }: Props) {
  const [scene, setScene] = useState('');
  const [note, setNote] = useState('');
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState('');
  const review = campaign.explainerReview;
  const made = Boolean(campaign.explainerScene) && video?.status === 'ready' && !video.stale;
  const sceneLabel = scenes.find((s) => s.name === campaign.explainerScene?.scene)?.label;
  return (
    <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50/40 p-3" aria-label="Animated explainer video">
      <p className="font-semibold text-slate-900">Animated explainer video <span className="ml-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">Recommended</span></p>
      <p className="mt-1 text-sm text-slate-600">The AI writes the whole video from your post and video script, with a voice and music, then checks it says what the post says. Press the button again for a new version.</p>
      {campaign.explainerError && <p role="alert" className="mt-2 text-sm text-red-700">The last try did not work: {campaign.explainerError}</p>}
      {made && sceneLabel && <p className="mt-2 text-sm text-slate-700"><strong>Made:</strong> {sceneLabel}{campaign.explainerScene?.subject ? ` · ${campaign.explainerScene.subject}` : ''}</p>}
      {made && review && <p className={`mt-1 text-sm ${review.matches ? 'text-emerald-800' : 'text-red-700'}`}>{review.matches ? `Matches the post (${review.score}/5).` : `Does not match the post well (${review.score}/5): ${(review.problems || []).join(' ')}`}</p>}
      {made && (
        <div className="mt-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600">Did this fit the post?</span>
            <button type="button" aria-label="Thumbs up" aria-pressed={campaign.videoFeedback?.rating === 'up'} disabled={disabled} onClick={() => { setAsking(false); onRate('up', ''); }} className={`rounded border px-2 py-1 ${campaign.videoFeedback?.rating === 'up' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300'}`}>👍</button>
            <button type="button" aria-label="Thumbs down" aria-pressed={campaign.videoFeedback?.rating === 'down'} disabled={disabled} onClick={() => setAsking(true)} className={`rounded border px-2 py-1 ${campaign.videoFeedback?.rating === 'down' ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}>👎</button>
          </div>
          {campaign.videoFeedback?.rating === 'down' && campaign.videoFeedback.reason && !asking && <p className="mt-1 text-xs text-slate-600">You said: {campaign.videoFeedback.reason}</p>}
          {asking && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="What was wrong? (optional)" aria-label="What was wrong" className="w-64 rounded border border-slate-300 px-2 py-1 text-sm" />
              <button type="button" className={`${button} border-slate-300 bg-white text-slate-700`} disabled={disabled} onClick={() => { onRate('down', reason); setAsking(false); setReason(''); }}>Save</button>
            </div>
          )}
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select aria-label="Scene" value={scene} onChange={(e) => setScene(e.target.value)} className="rounded border border-slate-300 bg-white px-2 py-2 text-sm" disabled={disabled || making}>
          <option value="">Scene: pick for me</option>
          {scenes.map((s) => <option key={s.name} value={s.name}>{s.label}</option>)}
        </select>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="What should it show? (optional)" aria-label="What should it show" className="w-72 rounded border border-slate-300 bg-white px-2 py-2 text-sm" disabled={disabled || making} />
        <button type="button" className={`${button} border-orange-500 bg-white text-orange-600 hover:bg-orange-50`} disabled={disabled || making} onClick={() => onMake(scene, note)}>
          {making ? 'Writing and making the video…' : 'Make the explainer video'}
        </button>
      </div>
      {making && <p role="status" className="mt-2 text-sm text-slate-600">Writing the words and recording the voice, then drawing the video. This takes about two minutes. You can leave this open.</p>}
    </div>
  );
}
