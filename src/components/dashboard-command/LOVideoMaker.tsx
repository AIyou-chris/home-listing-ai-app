import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MOOD_LABEL, playMusic, type Mood } from './promoMusic';
import { clamp01, drawBackdrop, drawIcon, drawPhoto, type IconKind } from './promoArt';

// Makes a short captioned video right in the browser. Free, no upload, no server.
// The loan officer edits every word, previews it, then downloads the file and posts it themselves.

type Topic = 'review' | 'buy' | 'class' | 'learn';
type Shape = 'vertical' | 'square';

const SCENES: Record<Topic, [string, string, string]> = {
  review: ['Is your mortgage rate about to change?', 'An adjustable rate can reset. A quick review shows if your loan still fits your plans.', 'Ask me for a free review. Link in my profile.'],
  buy: ['Thinking about buying a home?', 'The first step is not a house. It is knowing what you can comfortably afford.', 'Ask me anything. No pressure. Link in my profile.'],
  learn: ['Think you need 20% down to buy a home?', 'Take my free 3-minute Homebuyer 101. Play myth or fact, get your score.', 'Free. Tap the link in my profile.'],
  class: ['Want to learn how buying a home works?', 'My homebuyer class covers the steps and the programs that can help.', 'Save your seat. Link in my profile.'],
};
const TOPIC_LABEL: Record<Topic, string> = { review: 'Mortgage review', buy: 'Buying a home', class: 'Homebuyer class', learn: 'Free 101 lesson' };
const SIZE: Record<Shape, [number, number]> = { vertical: [720, 1280], square: [720, 720] };
const PALETTE: [string, string][] = [['#1d4ed8', '#0b1330'], ['#0f766e', '#052e2b'], ['#7c3aed', '#1e1040']];
const ICONS: Record<Topic, IconKind[]> = { review: ['rate', 'check', 'cta'], buy: ['house', 'check', 'cta'], class: ['calendar', 'check', 'cta'], learn: ['house', 'check', 'cta'] };
const SECONDS_PER_SCENE = 4;
const FONT = '-apple-system, Segoe UI, Helvetica, Arial, sans-serif';

const wrap = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  const lines: string[] = []; let line = '';
  for (const word of text.split(/\s+/)) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
};

const draw = (ctx: CanvasRenderingContext2D, w: number, h: number, scenes: string[], t: number, footer: string, topic: Topic, photo: HTMLImageElement | null) => {
  const total = SECONDS_PER_SCENE * scenes.length;
  const tt = Math.min(t, total - 0.001);
  const idx = Math.floor(tt / SECONDS_PER_SCENE);
  const local = tt - idx * SECONDS_PER_SCENE;
  const [c1, c2] = PALETTE[idx % PALETTE.length];
  drawBackdrop(ctx, w, h, c1, c2, tt);
  if (photo) drawPhoto(ctx, photo, w, h, tt / total, 0.55);
  const fade = clamp01(Math.min(local / 0.4, (SECONDS_PER_SCENE - local) / 0.4));
  const tall = h > w;
  ctx.globalAlpha = fade;
  drawIcon(ctx, ICONS[topic][idx] || 'none', w / 2, h * (tall ? 0.3 : 0.28), w * (tall ? 0.36 : 0.3), clamp01(local / 1.4), tt);
  const size = Math.round(w / (idx === 1 ? 16 : 13));
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `800 ${size}px ${FONT}`;
  const lines = wrap(ctx, scenes[idx] || '', w * 0.84);
  const lh = size * 1.25; const yMid = h * (tall ? 0.62 : 0.66); const y0 = yMid - ((lines.length - 1) * lh) / 2;
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 14;
  lines.forEach((l, i) => {
    const a = clamp01((local - 0.35 - i * 0.18) / 0.45);
    ctx.globalAlpha = fade * a; ctx.fillText(l, w / 2, y0 + i * lh + (1 - a) * 28);
  });
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  ctx.fillStyle = '#22d3ee'; ctx.fillRect(w * 0.42, y0 - lh * 0.95, w * 0.16 * clamp01(local / 0.8), 6);
  ctx.font = `600 ${Math.round(w / 34)}px ${FONT}`;
  ctx.fillStyle = '#c7d2fe'; ctx.fillText(footer, w / 2, h - w * 0.07);
  ctx.fillStyle = '#22d3ee'; ctx.fillRect(0, h - 8, (w * tt) / total, 8);
};

const LOVideoMaker: React.FC<{ footer: string; pictures?: { name: string; url: string | null }[]; forceTopic?: { topic: Topic; n: number; scenes?: string[] } }> = ({ footer, pictures = [], forceTopic }) => {
  const [topic, setTopic] = useState<Topic>('review');
  const [shape, setShape] = useState<Shape>('vertical');
  const [scenes, setScenes] = useState<string[]>([...SCENES.review]);
  const [making, setMaking] = useState(false);
  const [result, setResult] = useState<{ url: string; ext: string } | null>(null);
  const [mood, setMood] = useState<Mood>('calm');
  const previewRef = useRef<{ ac: AudioContext; stop: () => void } | null>(null);
  const [bgName, setBgName] = useState('');
  const photoRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const makingRef = useRef(false);
  const supported = typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined';

  const pickBg = (name: string) => {
    setResult(null); setBgName(name); photoRef.current = null; setError('');
    const pic = pictures.find((x) => x.name === name);
    if (!pic?.url) return;
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => { photoRef.current = img; };
    img.onerror = () => { setBgName(''); setError('That picture would not load. Using colors instead.'); };
    img.src = pic.url;
  };
  const stopPreview = () => { previewRef.current?.stop(); const ac = previewRef.current?.ac; previewRef.current = null; window.setTimeout(() => { void ac?.close().catch(() => undefined); }, 300); };
  useEffect(() => stopPreview, []);
  const previewMusic = (m: Mood) => {
    stopPreview();
    if (m === 'none') return;
    try { const ac = new AudioContext(); previewRef.current = { ac, stop: playMusic(ac, ac.destination, m, 8) }; } catch { /* no audio */ }
  };
  const pickTopic = (t: Topic) => { setTopic(t); setScenes([...SCENES[t]]); setResult(null); };
  useEffect(() => { if (!forceTopic) return; pickTopic(forceTopic.topic); if (forceTopic.scenes?.length === 3) setScenes([...forceTopic.scenes]); }, [forceTopic?.n]); // eslint-disable-line react-hooks/exhaustive-deps

  // Looping preview (paused while recording so the two do not fight over the canvas).
  useEffect(() => {
    const canvas = canvasRef.current; const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let raf = 0; const start = performance.now();
    const total = SECONDS_PER_SCENE * scenes.length;
    const tick = (now: number) => {
      if (!makingRef.current) draw(ctx, canvas.width, canvas.height, scenes, ((now - start) / 1000) % total, footer, topic, photoRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [scenes, shape, footer, topic]);

  const [error, setError] = useState('');
  const create = useCallback(async () => {
    const canvas = canvasRef.current; const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !supported) return;
    const mime = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m));
    if (!mime) return;
    setMaking(true); makingRef.current = true; setResult(null); setError('');
    try {
      stopPreview();
      const chunks: Blob[] = [];
      const stream = canvas.captureStream(30);
      let ac: AudioContext | null = null;
      if (mood !== 'none') {
        try {
          ac = new AudioContext(); const md = ac.createMediaStreamDestination();
          md.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
          playMusic(ac, md, mood, SECONDS_PER_SCENE * scenes.length);
        } catch { ac = null; }
      }
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 3_500_000 });
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      const done = new Promise<void>((resolve) => { rec.onstop = () => resolve(); });
      rec.start(250);
      const total = SECONDS_PER_SCENE * scenes.length; const start = performance.now();
      // A timer (not requestAnimationFrame) so the video still finishes if the tab is in the background.
      await new Promise<void>((resolve) => {
        const timer = window.setInterval(() => {
          const t = (performance.now() - start) / 1000;
          draw(ctx, canvas.width, canvas.height, scenes, t, footer, topic, photoRef.current);
          if (t >= total) { window.clearInterval(timer); resolve(); }
        }, 33);
      });
      rec.stop(); await done; void ac?.close().catch(() => undefined);
      const blob = new Blob(chunks, { type: mime.split(';')[0] });
      if (blob.size < 1000) throw new Error('empty');
      setResult({ url: URL.createObjectURL(blob), ext: mime.startsWith('video/mp4') ? 'mp4' : 'webm' });
    } catch {
      setError('Could not make the video. Try again, or try Chrome or Safari.');
    } finally {
      makingRef.current = false; setMaking(false);
    }
  }, [scenes, footer, supported, topic, mood]);

  const [w, h] = SIZE[shape];
  const chip = (on: boolean) => `rounded-full border px-3 py-1.5 text-xs font-bold ${on ? 'border-primary-600 bg-primary-600 text-white' : 'border-slate-200 bg-white text-slate-700'}`;
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {(Object.keys(TOPIC_LABEL) as Topic[]).map((t) => <button key={t} type="button" className={chip(topic === t)} onClick={() => pickTopic(t)}>{TOPIC_LABEL[t]}</button>)}
        <span className="mx-1 w-px bg-slate-200" />
        {(['vertical', 'square'] as Shape[]).map((s) => <button key={s} type="button" className={chip(shape === s)} onClick={() => { setShape(s); setResult(null); }}>{s === 'vertical' ? 'Vertical' : 'Square'}</button>)}
      </div>
      <div className="grid gap-4 md:grid-cols-[minmax(0,260px)_1fr]">
        <div className="mx-auto w-full max-w-[260px] overflow-hidden rounded-2xl bg-black ring-1 ring-slate-200">
          {result && <video src={result.url} controls playsInline className="w-full" />}
          <canvas ref={canvasRef} width={w} height={h} className={result ? 'hidden' : 'w-full'} aria-label="Video preview" />
        </div>
        <div className="space-y-2">
          {scenes.map((s, i) => (
            <label key={i} className="block text-xs font-semibold text-slate-700">Scene {i + 1}
              <textarea value={s} rows={2} maxLength={140} onChange={(e) => { setScenes(scenes.map((x, j) => j === i ? e.target.value : x)); setResult(null); }} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900" />
            </label>
          ))}
          {pictures.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto"><span className="text-xs text-slate-600">Background:</span>
              <button type="button" aria-pressed={!bgName} onClick={() => pickBg('')} className={`h-12 shrink-0 rounded-md border-2 px-2 text-xs font-bold text-slate-700 ${!bgName ? 'border-primary-600' : 'border-slate-200'}`}>Color</button>
              {pictures.slice(0, 10).map((p) => <button key={p.name} type="button" aria-pressed={bgName === p.name} onClick={() => pickBg(bgName === p.name ? '' : p.name)} className={`h-12 w-12 shrink-0 overflow-hidden rounded-md border-2 ${bgName === p.name ? 'border-primary-600' : 'border-transparent'}`}>{p.url && <img src={p.url} alt="" className="h-full w-full object-cover" />}</button>)}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2"><span className="text-xs text-slate-600">Music:</span>
            {(Object.keys(MOOD_LABEL) as Mood[]).map((m) => <button key={m} type="button" aria-pressed={mood === m} className={chip(mood === m)} onClick={() => { setMood(m); setResult(null); previewMusic(m); }}>{MOOD_LABEL[m]}</button>)}
          </div>
          <p className="text-xs text-slate-600">{SECONDS_PER_SCENE * scenes.length} seconds. Your name and NMLS are added at the bottom. No promises about rates or approval.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={making || !supported} onClick={() => void create()} className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-60">{making ? `Making your video… ${SECONDS_PER_SCENE * scenes.length}s` : result ? 'Make it again' : 'Create video'}</button>
            {result && <a href={result.url} download={`my-video.${result.ext}`} className="rounded-xl border border-primary-600 px-5 py-2.5 text-sm font-bold text-primary-700">Download video</a>}
          </div>
          {error && <p role="alert" className="text-xs text-amber-800">{error}</p>}
          {!supported && <p className="text-xs text-amber-800">This browser cannot make videos. Try Chrome or Safari.</p>}
          {result && <p className="text-xs text-slate-600">Download it, then post it yourself. Nothing is posted for you.</p>}
        </div>
      </div>
    </div>
  );
};

export type { Topic as VideoTopic };
export default LOVideoMaker;
