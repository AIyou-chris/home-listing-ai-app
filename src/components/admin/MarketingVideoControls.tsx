import React from 'react';
import type { StudioMedia } from '../../services/adminMarketingMediaService';
import type { StudioVideoOptions } from '../../services/studioVideoOptions';
type Props = { options: StudioVideoOptions; setOptions: (options: StudioVideoOptions) => void; disabled: boolean; aiVoice: boolean; voice?: StudioMedia; music?: StudioMedia; makeVoice: () => void; upload: (kind: 'voice' | 'music', file?: File) => void };
const field = 'mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm';
export default function MarketingVideoControls({ options, setOptions, disabled, aiVoice, voice, music, makeVoice, upload }: Props) {
  const select = (key: keyof StudioVideoOptions, value: string) => setOptions({ ...options, [key]: value });
  return <details className="mt-4 rounded-xl border border-slate-200 bg-white p-3" open>
    <summary className="cursor-pointer font-semibold text-slate-900">Voice, music & style</summary>
    <div className="mt-3 grid grid-cols-2 gap-3">
      <label className="text-sm font-semibold text-slate-700">Narration<select aria-label="Narration" className={field} value={options.narration} disabled={disabled} onChange={e => select('narration', e.target.value)}><option value="none">Voice off</option><option value="saved">Voice on</option></select></label>
      <label className="text-sm font-semibold text-slate-700">Voice speed<select aria-label="Voice speed" className={field} value={options.voiceSpeed} disabled={disabled} onChange={e => select('voiceSpeed', e.target.value)}><option value="0.9">Slower</option><option value="1">Normal</option><option value="1.1">Faster</option></select></label>
    </div>
    {options.narration === 'saved' && <div className="mt-3 rounded-lg bg-slate-50 p-3">
      <label className="block text-sm font-semibold text-slate-700">AI voice<select aria-label="AI voice" className={field} value={options.voice} disabled={disabled} onChange={e => select('voice', e.target.value)}><option value="nova">Nova</option><option value="alloy">Alloy</option><option value="onyx">Onyx</option></select></label>
      <button type="button" disabled={disabled || !aiVoice} onClick={makeVoice} className="mt-2 min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">Generate AI voice — uses API balance</button>
      <p className="mt-2 text-xs text-slate-500">Save settings first. Up to three AI voice attempts per campaign. AI narration is labelled in the finished video.</p>
      <label className="mt-3 block text-sm font-semibold text-slate-700">Or upload your recorded voice — free<input aria-label="Upload recorded voice" type="file" accept="audio/mpeg,audio/wav,audio/mp4,audio/webm,audio/ogg,.mp3,.wav,.m4a,.webm,.ogg" disabled={disabled} onChange={e => { upload('voice', e.target.files?.[0]); e.target.value = ''; }} className="mt-2 block w-full text-sm" /></label>
      {voice?.url && <audio className="mt-3 w-full" src={voice.url} controls preload="metadata" aria-label="Saved voice preview" />}
      {voice?.stale && <p className="mt-2 text-sm text-amber-800">Your script or voice changed. Make or upload the voice again.</p>}
      {voice?.error && <p className="mt-2 text-sm text-red-700">{voice.error}</p>}
    </div>}
    <div className="mt-3 grid grid-cols-2 gap-3">
      <label className="text-sm font-semibold text-slate-700">Music<select aria-label="Background music" className={field} value={options.music} disabled={disabled} onChange={e => select('music', e.target.value)}><option value="none">No music</option><option value="calm">Calm</option><option value="upbeat">Upbeat</option><option value="upload">Upload</option></select></label>
      <label className="text-sm font-semibold text-slate-700">Music volume<select aria-label="Music volume" className={field} value={options.musicVolume} disabled={disabled} onChange={e => select('musicVolume', e.target.value)}><option value="low">Quiet</option><option value="medium">Medium</option></select></label>
      <label className="text-sm font-semibold text-slate-700">Captions<select aria-label="Caption size" className={field} value={options.captionSize} disabled={disabled} onChange={e => select('captionSize', e.target.value)}><option value="normal">Normal</option><option value="large">Larger</option></select></label>
      <label className="text-sm font-semibold text-slate-700">Colour<select aria-label="Video colour" className={field} value={options.videoStyle} disabled={disabled} onChange={e => select('videoStyle', e.target.value)}><option value="blue">Blue & indigo</option><option value="dark">Dark slate</option></select></label>
    </div>
    <div className="mt-3 grid grid-cols-2 gap-3">
      <label className="text-sm font-semibold text-slate-700">Picture movement<select aria-label="Picture movement" className={field} value={options.motion} disabled={disabled} onChange={e => select('motion', e.target.value)}><option value="gentle">Slow zoom</option><option value="still">Still</option></select></label>
      <label className="text-sm font-semibold text-slate-700">Transitions<select aria-label="Caption transitions" className={field} value={options.transition} disabled={disabled} onChange={e => select('transition', e.target.value)}><option value="fade">Soft fade</option><option value="cut">Cut</option></select></label>
    </div>
    <label className="mt-3 block text-sm font-semibold text-slate-700">Ending<select aria-label="Video ending" className={field} value={options.endCard} disabled={disabled} onChange={e => select('endCard', e.target.value)}><option value="wow">Logo + See a WOW Link</option><option value="none">No ending card</option></select></label>
    {options.music === 'upload' && <div className="mt-3"><label className="block text-sm font-semibold text-slate-700">Upload music you can use<input aria-label="Upload music" type="file" accept="audio/mpeg,audio/wav,audio/mp4,audio/webm,audio/ogg,.mp3,.wav,.m4a,.webm,.ogg" disabled={disabled} onChange={e => { upload('music', e.target.files?.[0]); e.target.value = ''; }} className="mt-2 block w-full text-sm" /></label>{music?.url && <audio className="mt-3 w-full" src={music.url} controls preload="metadata" aria-label="Saved music preview" />}{music?.error && <p className="mt-2 text-sm text-red-700">{music.error}</p>}</div>}
    <p className="mt-3 text-xs text-slate-500">Uploads: under 8 MB and 90 seconds. Built-in music is made here, with no song subscription. Caption changes follow voice pauses where possible. Timing is estimated; preview before sharing.</p>
  </details>;
}
