import React, { useState } from 'react';

// The video part of one Autopilot post: what the video is, whether it says what the post says, a player, the script,
// a scene picker with "what should it show?", "Make the explainer video", and thumbs that teach the writer.

export type VideoInfo = { scene?: string; sceneLabel?: string; subject?: string; review?: { score: number; matches: boolean; problems?: string[] } | null; rating?: string; reason?: string; error?: string };
export type VideoPost = { campaignId: string; videoUrl?: string; makingVideo?: boolean; script?: string; video?: VideoInfo | null };
export type SceneChoice = { name: string; label: string };

const btn = 'rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50';

type Props = {
  post: VideoPost;
  scenes: SceneChoice[];
  busy: boolean;
  canMake?: boolean;
  onMake: (campaignId: string, scene: string, note: string) => void | Promise<void>;
  onRate: (campaignId: string, rating: 'up' | 'down', reason: string) => void | Promise<void>;
};

export default function AutopilotVideo({ post, scenes, busy, canMake = true, onMake, onRate }: Props) {
  const [scene, setScene] = useState('');
  const [note, setNote] = useState('');
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState('');
  const info = post.video;
  const making = post.makingVideo === true;
  const review = info?.review;

  return (
    <div className="mt-2 rounded-lg border border-slate-200 p-3 text-sm text-slate-800">
      <p><strong>Video:</strong> {making ? 'Being made…' : post.videoUrl ? `Ready${info?.sceneLabel ? ` · ${info.sceneLabel}` : ''}${info?.subject ? ` · ${info.subject}` : ''}` : 'none yet'}</p>
      {info?.error && <p role="alert" className="mt-1 text-red-700">The last try did not work: {info.error}</p>}
      {review && (
        <p className={`mt-1 ${review.matches ? 'text-emerald-800' : 'text-red-700'}`}>
          {review.matches ? `Matches the post (${review.score}/5).` : `Does not match the post well (${review.score}/5): ${(review.problems || []).join(' ')}`}
        </p>
      )}
      {post.videoUrl && !making && (
        <div className="mt-2">
          <video src={post.videoUrl} controls playsInline preload="metadata" className="w-44 rounded-lg border border-slate-200" />
          {info?.scene && (
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">Did this fit the post?</span>
                <button type="button" aria-label="Thumbs up" aria-pressed={info.rating === 'up'} disabled={busy} onClick={() => { setAsking(false); void onRate(post.campaignId, 'up', ''); }} className={`rounded border px-2 py-1 ${info.rating === 'up' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300'}`}>👍</button>
                <button type="button" aria-label="Thumbs down" aria-pressed={info.rating === 'down'} disabled={busy} onClick={() => setAsking(true)} className={`rounded border px-2 py-1 ${info.rating === 'down' ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}>👎</button>
              </div>
              {info.rating === 'down' && info.reason && !asking && <p className="mt-1 text-xs text-slate-600">You said: {info.reason}</p>}
              {asking && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="What was wrong? (optional)" aria-label="What was wrong" className="w-64 rounded border border-slate-300 px-2 py-1 text-sm" />
                  <button type="button" className={btn} disabled={busy} onClick={() => { void onRate(post.campaignId, 'down', reason); setAsking(false); setReason(''); }}>Save</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {post.script && <div className="mt-2 rounded bg-slate-50 p-2"><p><strong>Video script:</strong> {post.script}</p></div>}
      {canMake && <div className="mt-3 flex flex-wrap items-center gap-2">
        <select aria-label="Scene" value={scene} onChange={(e) => setScene(e.target.value)} className="rounded border border-slate-300 px-2 py-2 text-sm">
          <option value="">Scene: pick for me</option>
          {scenes.map((s) => <option key={s.name} value={s.name}>{s.label}</option>)}
        </select>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="What should it show? (optional)" aria-label="What should it show" className="w-72 rounded border border-slate-300 px-2 py-2 text-sm" />
        <button type="button" className="rounded-lg border border-orange-500 px-3 py-2 text-sm font-semibold text-orange-600 hover:bg-orange-50 disabled:opacity-60" disabled={busy || making} onClick={() => void onMake(post.campaignId, scene, note)}>
          {making ? 'Making the video…' : 'Make the explainer video'}
        </button>
      </div>}
    </div>
  );
}
