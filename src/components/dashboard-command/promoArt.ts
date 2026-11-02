// Small canvas drawing kit shared by the Promote video and image makers.
// Everything is drawn in code: free, instant, nothing to upload or license.

export type IconKind = 'house' | 'rate' | 'calendar' | 'check' | 'cta' | 'none';

export const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
export const ease = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
const back = (t: number) => { const c = 1.7; const x = clamp01(t) - 1; return 1 + (c + 1) * x * x * x + c * x * x; };
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

const rr = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
};

/** Soft gradient with slow drifting glow orbs and a faint grid. `time` is seconds. */
export const drawBackdrop = (ctx: CanvasRenderingContext2D, w: number, h: number, c1: string, c2: string, time: number) => {
  const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, c1); g.addColorStop(1, c2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const orbs: [number, number, number, number, string][] = [
    [0.2, 0.25, 0.55, 0.0, 'rgba(34,211,238,0.30)'],
    [0.85, 0.7, 0.6, 2.1, 'rgba(255,255,255,0.14)'],
    [0.55, 0.95, 0.5, 4.2, 'rgba(250,204,21,0.18)'],
  ];
  orbs.forEach(([ox, oy, or, ph, col]) => {
    const x = w * (ox + 0.06 * Math.sin(time * 0.6 + ph)); const y = h * (oy + 0.05 * Math.cos(time * 0.5 + ph)); const r = Math.max(w, h) * or;
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
  });
  ctx.strokeStyle = 'rgba(255,255,255,0.045)'; ctx.lineWidth = 1;
  const step = Math.round(w / 12);
  for (let x = 0; x <= w; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y <= h; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
};

/** Draws a picture to cover the canvas with a slow zoom (Ken Burns) and a dark wash so text stays readable. */
export const drawPhoto = (ctx: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number }, w: number, h: number, zoom: number, wash = 0.55) => {
  const s = Math.max(w / img.width, h / img.height) * (1 + 0.12 * clamp01(zoom));
  const dw = img.width * s; const dh = img.height * s;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  ctx.fillStyle = `rgba(6,10,26,${wash})`; ctx.fillRect(0, 0, w, h);
};

/**
 * Animated icon centred at (cx, cy) inside a box of `size` px. `p` is 0..1 progress of the scene's
 * intro; `time` keeps small loops going. Illustrations only: no numbers that read as a promise.
 */
export const drawIcon = (ctx: CanvasRenderingContext2D, kind: IconKind, cx: number, cy: number, size: number, p: number, time: number, accent = '#22d3ee', ink = '#ffffff') => {
  if (kind === 'none') return;
  ctx.save(); ctx.translate(cx, cy);
  const pop = back(seg(p, 0, 0.35)); ctx.scale(0.4 + 0.6 * pop, 0.4 + 0.6 * pop); ctx.globalAlpha *= clamp01(p * 4);
  const u = size / 100; ctx.scale(u, u);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';

  if (kind === 'house') {
    const body = ease(seg(p, 0.05, 0.5)); const roof = ease(seg(p, 0.35, 0.8)); const det = ease(seg(p, 0.7, 1));
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.strokeStyle = ink; ctx.lineWidth = 5;
    rr(ctx, -34, 46 - 62 * body, 68, 62 * body, 4); ctx.fill(); ctx.stroke();
    if (roof > 0) {
      ctx.beginPath(); ctx.moveTo(-44, -16 + (1 - roof) * 22); ctx.lineTo(0, -52 + (1 - roof) * 34); ctx.lineTo(44, -16 + (1 - roof) * 22);
      ctx.fillStyle = accent; ctx.globalAlpha *= roof; ctx.fill(); ctx.globalAlpha /= Math.max(roof, 0.001);
    }
    ctx.globalAlpha *= det; ctx.fillStyle = ink; rr(ctx, -9, 22, 18, 24, 3); ctx.fill();
    ctx.fillStyle = accent; rr(ctx, -26, -6, 14, 14, 2); ctx.fill(); rr(ctx, 12, -6, 14, 14, 2); ctx.fill();
  } else if (kind === 'rate') {
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.strokeStyle = ink; ctx.lineWidth = 4; rr(ctx, -58, -34, 116, 68, 14); ctx.fill(); ctx.stroke();
    ctx.fillStyle = ink; ctx.globalAlpha *= 0.75; ctx.font = '600 13px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('YOUR RATE', 0, -18); ctx.globalAlpha /= 0.75;
    ctx.fillStyle = accent; ctx.font = '800 34px system-ui, sans-serif';
    const tick = Math.floor(time * 6); const d = (n: number) => String((tick * 7 + n * 3) % 10);
    ctx.fillText(`${d(1)}.${d(2)}${d(3)}%`, -6, 10);
    const bob = Math.sin(time * 4) * 3; ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(40, 22 + bob); ctx.lineTo(40, 2 + bob); ctx.moveTo(32, 10 + bob); ctx.lineTo(40, 2 + bob); ctx.lineTo(48, 10 + bob); ctx.stroke();
  } else if (kind === 'calendar') {
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; rr(ctx, -50, -44, 100, 90, 12); ctx.fill();
    ctx.fillStyle = accent; ctx.beginPath(); ctx.moveTo(-50, -20); ctx.lineTo(-50, -32); ctx.arcTo(-50, -44, -38, -44, 12); ctx.lineTo(38, -44); ctx.arcTo(50, -44, 50, -32, 12); ctx.lineTo(50, -20); ctx.closePath(); ctx.fill();
    ctx.fillStyle = ink; ctx.strokeStyle = '#334155'; ctx.lineWidth = 5;
    [-26, 26].forEach((x) => { ctx.beginPath(); ctx.moveTo(x, -52); ctx.lineTo(x, -38); ctx.stroke(); });
    const hit = 8;
    for (let i = 0; i < 12; i++) {
      const x = -34 + (i % 4) * 23; const y = -6 + Math.floor(i / 4) * 20;
      if (i === hit) { ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(x, y, 9 + Math.sin(time * 5) * 1.5, 0, Math.PI * 2); ctx.fill(); } else { ctx.fillStyle = '#cbd5e1'; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); }
    }
  } else if (kind === 'check') {
    for (let i = 0; i < 3; i++) {
      const y = -34 + i * 34; const t = ease(seg(p, 0.1 + i * 0.22, 0.4 + i * 0.22));
      ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.strokeStyle = ink; ctx.lineWidth = 4; rr(ctx, -52, y - 13, 26, 26, 7); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = accent; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-47, y); ctx.lineTo(-40, y + 7 * t); ctx.lineTo(-40 + 14 * t, y + 7 - 14 * t); ctx.globalAlpha *= t; ctx.stroke(); ctx.globalAlpha /= Math.max(t, 0.001);
      ctx.fillStyle = ink; ctx.globalAlpha *= 0.85; rr(ctx, -16, y - 5, 66 * (0.7 + 0.3 * ((i + 1) % 3) / 2) * ease(seg(p, 0.1 + i * 0.22, 0.6 + i * 0.22)), 10, 5); ctx.fill(); ctx.globalAlpha /= 0.85;
    }
  } else if (kind === 'cta') {
    const pulse = 1 + 0.04 * Math.sin(time * 5);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = accent; rr(ctx, -52, -26, 104, 52, 26); ctx.fill();
    ctx.strokeStyle = '#0a1020'; ctx.lineWidth = 7; const nudge = Math.sin(time * 6) * 3;
    ctx.beginPath(); ctx.moveTo(-18 + nudge, 0); ctx.lineTo(18 + nudge, 0); ctx.moveTo(8 + nudge, -11); ctx.lineTo(19 + nudge, 0); ctx.lineTo(8 + nudge, 11); ctx.stroke();
  }
  ctx.restore();
};

export const ICON_LABEL: Record<IconKind, string> = { none: 'None', house: 'House', rate: 'Rate', calendar: 'Class', check: 'Checklist', cta: 'Tap' };
