import React, { useEffect, useRef, useState } from 'react';
import { drawBackdrop, drawIcon, drawPhoto, ICON_LABEL, type IconKind } from './promoArt';

interface Pic { name: string; url: string | null }
type Shape = 'square' | 'wide' | 'tall';

const SHAPES: Record<Shape, { label: string; w: number; h: number }> = {
  square: { label: 'Square', w: 1080, h: 1080 },
  wide: { label: 'Wide', w: 1200, h: 630 },
  tall: { label: 'Tall', w: 1080, h: 1350 },
};
const STYLES = [
  { id: 'navy', label: 'Navy', a: '#0a1020', b: '#1e3a8a', ink: '#ffffff', accent: '#22d3ee' },
  { id: 'teal', label: 'Teal', a: '#065f46', b: '#0e7490', ink: '#ffffff', accent: '#fde68a' },
  { id: 'sun', label: 'Sunrise', a: '#f59e0b', b: '#ea580c', ink: '#1c1917', accent: '#ffffff' },
  { id: 'light', label: 'Light', a: '#f8fafc', b: '#e0e7ff', ink: '#0f172a', accent: '#4f46e5' },
] as const;

const wrap = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
  const lines: string[] = [];
  text.split('\n').forEach((para) => {
    let line = '';
    para.split(/\s+/).filter(Boolean).forEach((word) => {
      const test = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(test).width > maxWidth) { lines.push(line); line = word; } else line = test;
    });
    lines.push(line);
  });
  return lines;
};

const loadImage = (url: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const img = new Image(); img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img); img.onerror = () => reject(new Error('image_failed')); img.src = url;
});

interface Props {
  footer: string;
  headline: string;
  pictures: Pic[];
  canSave: boolean;
  onUse: (dataUrl: string) => void;
  onSave: (dataUrl: string) => void;
}

const LOImageMaker: React.FC<Props> = ({ footer, headline, pictures, canSave, onUse, onSave }) => {
  const [shape, setShape] = useState<Shape>('square');
  const [styleId, setStyleId] = useState<(typeof STYLES)[number]['id']>('navy');
  const [big, setBig] = useState(headline);
  const [small, setSmall] = useState('Free, no pressure.');
  const [photo, setPhoto] = useState<Pic | null>(null);
  const [icon, setIcon] = useState<IconKind>('house');
  const [note, setNote] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const touched = useRef(false);

  // Follow the post's first line until the LO types their own headline.
  useEffect(() => { if (!touched.current && headline) setBig(headline); }, [headline]);

  useEffect(() => {
    let live = true;
    (async () => {
      const canvas = canvasRef.current; const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      const { w, h } = SHAPES[shape]; const st = STYLES.find((s) => s.id === styleId) || STYLES[0];
      canvas.width = w; canvas.height = h;
      drawBackdrop(ctx, w, h, st.a, st.b, 1.5);
      let ink: string = st.ink;
      if (photo?.url) {
        try {
          const img = await loadImage(photo.url);
          if (!live) return;
          drawPhoto(ctx, img, w, h, 0, 0.62);
          ink = '#ffffff'; setNote('');
        } catch { if (live) setNote('That picture would not load. Using the colors instead.'); }
      } else setNote('');
      const pad = Math.round(w * 0.08);
      ctx.fillStyle = st.accent; ctx.fillRect(pad, pad, Math.round(w * 0.12), 10);
      const size = Math.round(w * (shape === 'wide' ? 0.065 : 0.075));
      ctx.font = `800 ${size}px system-ui, -apple-system, Segoe UI, sans-serif`; ctx.textBaseline = 'top'; ctx.fillStyle = ink;
      const wide = shape === 'wide';
      const isz = Math.round(w * (wide ? 0.26 : 0.3));
      const textW = wide && icon !== 'none' ? Math.round(w * 0.6) : w - pad * 2;
      if (icon !== 'none') drawIcon(ctx, icon, wide ? w - pad - isz / 2 : w - pad - isz / 2, wide ? h / 2 : pad + isz / 2 + 10, isz, 1, 1.2, st.accent, ink);
      const lines = wrap(ctx, big || ' ', textW).slice(0, 6);
      const lh = Math.round(size * 1.18);
      const blockH = lines.length * lh;
      let y = Math.max(wide || icon === 'none' ? pad + 40 : pad + isz + 40, Math.round((h - blockH) / 2) - Math.round(h * 0.04));
      lines.forEach((l) => { ctx.fillText(l, pad, y); y += lh; });
      if (small) {
        const ss = Math.round(size * 0.52);
        ctx.font = `600 ${ss}px system-ui, -apple-system, Segoe UI, sans-serif`; ctx.fillStyle = st.accent;
        wrap(ctx, small, textW).slice(0, 2).forEach((l) => { ctx.fillText(l, pad, y + Math.round(size * 0.3)); y += Math.round(ss * 1.25); });
      }
      ctx.font = `600 ${Math.round(w * 0.028)}px system-ui, -apple-system, Segoe UI, sans-serif`; ctx.fillStyle = ink; ctx.globalAlpha = 0.85;
      ctx.textBaseline = 'bottom'; ctx.fillText(footer, pad, h - pad * 0.7); ctx.globalAlpha = 1;
    })();
    return () => { live = false; };
  }, [shape, styleId, big, small, photo, footer, icon]);

  const exportUrl = (type: 'image/png' | 'image/jpeg') => {
    try { return canvasRef.current?.toDataURL(type, 0.86) || ''; } catch { setNote('Could not export with that picture. Pick a color instead.'); return ''; }
  };
  const download = () => {
    const url = exportUrl('image/png'); if (!url) return;
    const a = document.createElement('a'); a.href = url; a.download = 'my-post-image.png'; a.click();
  };

  const field = 'w-full rounded-lg border border-indigo-900 bg-[#0d1530] px-3 py-2 text-sm text-white';
  const chip = (on: boolean) => `rounded-full border px-3 py-1.5 text-xs font-bold ${on ? 'border-cyan-400 bg-cyan-400 text-slate-900' : 'border-indigo-800 bg-indigo-950 text-indigo-200'}`;
  const ghost = 'rounded-lg border border-indigo-800 bg-transparent px-3 py-1.5 text-xs font-bold text-indigo-200 hover:bg-indigo-950';
  const solid = 'rounded-xl bg-cyan-400 px-4 py-2 text-sm font-extrabold text-slate-900 hover:bg-cyan-300';

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Shape">
          {(Object.keys(SHAPES) as Shape[]).map((k) => <button key={k} type="button" aria-pressed={shape === k} className={chip(shape === k)} onClick={() => setShape(k)}>{SHAPES[k].label}</button>)}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Color">
          {STYLES.map((s) => <button key={s.id} type="button" aria-pressed={styleId === s.id} className={chip(styleId === s.id)} onClick={() => setStyleId(s.id)}>{s.label}</button>)}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Picture">
          {(Object.keys(ICON_LABEL) as IconKind[]).map((k) => <button key={k} type="button" aria-pressed={icon === k} className={chip(icon === k)} onClick={() => setIcon(k)}>{ICON_LABEL[k]}</button>)}
        </div>
        <label className="block text-xs text-indigo-300">Big words
          <textarea value={big} rows={3} maxLength={140} onChange={(e) => { touched.current = true; setBig(e.target.value); }} className={`${field} mt-1`} />
        </label>
        <label className="block text-xs text-indigo-300">Small line
          <input value={small} maxLength={80} onChange={(e) => setSmall(e.target.value)} className={`${field} mt-1`} />
        </label>
        {pictures.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto"><span className="text-xs text-indigo-300">Background:</span>
            <button type="button" aria-pressed={!photo} onClick={() => setPhoto(null)} className={`h-12 shrink-0 rounded-md border-2 px-2 text-xs font-bold text-indigo-200 ${!photo ? 'border-cyan-400' : 'border-indigo-900'}`}>Color</button>
            {pictures.slice(0, 10).map((p) => <button key={p.name} type="button" aria-pressed={photo?.name === p.name} onClick={() => setPhoto(photo?.name === p.name ? null : p)} className={`h-12 w-12 shrink-0 overflow-hidden rounded-md border-2 ${photo?.name === p.name ? 'border-cyan-400' : 'border-transparent'}`}>{p.url && <img src={p.url} alt="" className="h-full w-full object-cover" />}</button>)}
          </div>
        )}
      </div>
      <div>
        <canvas ref={canvasRef} aria-label="Your post image" className="mx-auto max-h-[420px] w-full rounded-xl border border-indigo-900 object-contain" style={{ aspectRatio: `${SHAPES[shape].w} / ${SHAPES[shape].h}` }} />
        {note && <p className="mt-2 text-xs text-amber-300">{note}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={solid} onClick={() => { const u = exportUrl('image/jpeg'); if (u) onUse(u); }}>Use in my post</button>
          <button type="button" className={ghost} onClick={download}>Download</button>
          {canSave && <button type="button" className={ghost} onClick={() => { const u = exportUrl('image/jpeg'); if (u) onSave(u); }}>Save to my pictures</button>}
        </div>
      </div>
    </div>
  );
};

export default LOImageMaker;
