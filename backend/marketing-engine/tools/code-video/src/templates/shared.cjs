/**
 * Pieces every scene shares: the backdrop, the brand mark, an opening title
 * card and the closing headline with its button. Scenes call these with the
 * moment each should start, so they stay in step with the scene's own timing.
 */
const { seg, outC, outB, lerp } = require('../easing.cjs');
const { fillRoundRect, wrapText, setFont, drawLines, withMotion } = require('../kit.cjs');

const BASE_LIMITS = { brand: 20, sampleLabel: 30, endLine: 110, cta: 30, small: 80, url: 30 };

const BASE_DEFAULTS = {
  brand: 'AN AI YOU',
  sampleLabel: 'SAMPLE BUSINESS SHOWN',
  endHeadline: ['Built to', 'be useful.'],
  endAccent: 'be useful.',
  endLine: 'Your AI Employee answers, books it and saves the lead while you sleep.',
  cta: 'BUILD MY AI BUSINESS FREE',
  small: 'No credit card. Build it. Test it. Decide when you are ready.',
  url: 'anaiyou.com',
  accent: '#ff5a36',
  bg: 'auto'
};

/** Cuts text to its limit and checks the colour. Throws a plain message on a bad shape. */
function cleanBase(c) {
  for (const [key, max] of Object.entries(BASE_LIMITS)) c[key] = String(c[key]).trim().slice(0, max);
  if (!Array.isArray(c.endHeadline) || c.endHeadline.length < 1 || c.endHeadline.length > 3) throw new Error('endHeadline must be one to three short lines');
  c.endHeadline = c.endHeadline.map(l => String(l).trim().slice(0, 22));
  c.endAccent = String(c.endAccent || '').slice(0, 22);
  if (!/^#[0-9a-f]{6}$/i.test(c.accent)) throw new Error('accent must be a hex colour like #ff5a36');
  if (c.bg !== 'auto' && !BG_STYLES.includes(c.bg)) throw new Error(`bg must be auto or one of ${BG_STYLES.join(', ')}`);
  return c;
}

/**
 * Moving, colourful backgrounds. Each video gets one (chosen from its own words
 * unless `bg` names one), always under a dark scrim so white text stays easy to read.
 */
const BG_STYLES = ['aurora', 'sunburst', 'waves', 'bubbles', 'grid'];
const PALETTES = [
  { base: ['#150a2e', '#2b0f4a'], blobs: ['#ff5a36', '#ff2e93', '#7c3aed'] },
  { base: ['#041a2e', '#08324f'], blobs: ['#22d3ee', '#2563eb', '#ff5a36'] },
  { base: ['#1a0b0b', '#3a1010'], blobs: ['#ff5a36', '#fbbf24', '#ff2e93'] },
  { base: ['#07201a', '#0b3b2e'], blobs: ['#34d399', '#22d3ee', '#fbbf24'] },
  { base: ['#12122e', '#1e1b4b'], blobs: ['#a78bfa', '#f472b6', '#38bdf8'] }
];

/** A small number from the video's own text, so the same video always gets the same background. */
function textHash(cfg) {
  const text = JSON.stringify(cfg, (k, v) => (k === 'audio' ? undefined : v));
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

function rgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function pickBackground(cfg = {}) {
  const h = textHash(cfg);
  const style = cfg.bg && cfg.bg !== 'auto' ? cfg.bg : BG_STYLES[h % BG_STYLES.length];
  return { style, palette: PALETTES[(h >>> 4) % PALETTES.length] };
}

function paintBase(ctx, pal) {
  const g = ctx.createLinearGradient(0, 0, 0, 1280);
  g.addColorStop(0, pal.base[0]); g.addColorStop(1, pal.base[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, 720, 1280);
}

function glow(ctx, x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, alpha)); g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

const BACKGROUNDS = {
  aurora(ctx, t, pal) {
    paintBase(ctx, pal);
    pal.blobs.forEach((color, i) => glow(ctx, 360 + 300 * Math.cos(t * 0.45 + i * 2.1), 640 + 460 * Math.sin(t * 0.38 + i * 1.7), 600, color, 0.85));
  },
  sunburst(ctx, t, pal) {
    paintBase(ctx, pal);
    glow(ctx, 360, 1280, 1000, pal.blobs[0], 0.5);
    ctx.save(); ctx.translate(360, 1180); ctx.rotate(t * 0.12);
    const rays = 18;
    for (let i = 0; i < rays; i += 2) {
      const a0 = (i / rays) * Math.PI * 2; const a1 = ((i + 1) / rays) * Math.PI * 2;
      ctx.fillStyle = rgba(pal.blobs[i % 3 === 0 ? 1 : 0], 0.3);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a0) * 2200, Math.sin(a0) * 2200); ctx.lineTo(Math.cos(a1) * 2200, Math.sin(a1) * 2200); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    glow(ctx, 360, 180, 520, pal.blobs[2], 0.35);
  },
  waves(ctx, t, pal) {
    paintBase(ctx, pal);
    glow(ctx, 540, 260, 520, pal.blobs[1], 0.4); glow(ctx, 120, 520, 460, pal.blobs[0], 0.34);
    for (let layer = 0; layer < 4; layer += 1) {
      const y0 = 700 + layer * 130;
      ctx.beginPath(); ctx.moveTo(0, 1280); ctx.lineTo(0, y0);
      for (let x = 0; x <= 720; x += 12) ctx.lineTo(x, y0 + Math.sin(x * 0.012 + t * (0.8 + layer * 0.3) + layer) * 40 + Math.sin(x * 0.027 - t * 0.6) * 14);
      ctx.lineTo(720, 1280); ctx.closePath();
      ctx.fillStyle = rgba(pal.blobs[layer % 3], 0.3 + layer * 0.05); ctx.fill();
    }
  },
  bubbles(ctx, t, pal) {
    paintBase(ctx, pal);
    glow(ctx, 360, 1280, 900, pal.blobs[0], 0.35);
    let seed = 12345; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < 30; i += 1) {
      const size = 18 + rnd() * 70; const speed = 40 + rnd() * 110; const x0 = rnd() * 720; const off = rnd() * 1600; const sway = 10 + rnd() * 30;
      const y = 1280 + size - ((t * speed + off) % (1280 + size * 2));
      const x = x0 + Math.sin(t * 0.8 + i) * sway;
      ctx.fillStyle = rgba(pal.blobs[i % 3], 0.2 + rnd() * 0.18);
      if (i % 3 === 0) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.5 + i);
        ctx.beginPath(); ctx.roundRect(-size / 2, -size / 2, size, size, size * 0.25); ctx.fill(); ctx.restore();
      } else { ctx.beginPath(); ctx.arc(x, y, size / 2, 0, Math.PI * 2); ctx.fill(); }
    }
  },
  grid(ctx, t, pal) {
    paintBase(ctx, pal);
    const horizon = 760;
    glow(ctx, 360, horizon, 600, pal.blobs[1], 0.4);
    const sun = ctx.createLinearGradient(0, horizon - 230, 0, horizon);
    sun.addColorStop(0, pal.blobs[1]); sun.addColorStop(1, pal.blobs[0]);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 720, horizon); ctx.clip();
    ctx.fillStyle = sun; ctx.beginPath(); ctx.arc(360, horizon, 230, Math.PI, 0); ctx.fill();
    ctx.fillStyle = pal.base[0];
    for (let i = 0; i < 6; i += 1) ctx.fillRect(130, horizon - 20 - i * 34 - ((t * 10) % 34) * 0, 460, 3 + i * 1.5);
    ctx.restore();
    ctx.strokeStyle = rgba(pal.blobs[2], 0.6); ctx.lineWidth = 2;
    for (let i = -14; i <= 14; i += 1) { ctx.beginPath(); ctx.moveTo(360 + i * 12, horizon); ctx.lineTo(360 + i * 170, 1280); ctx.stroke(); }
    for (let i = 0; i < 12; i += 1) {
      const p = ((i + (t * 0.8) % 1) / 12); const y = horizon + (1280 - horizon) * p * p;
      ctx.globalAlpha = 0.25 + p * 0.5; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(720, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
};

/** The scene's background at time `t`. Pass the scene's config so each video gets its own. */
function backdrop(ctx, t = 0, cfg = {}) {
  const { style, palette } = pickBackground(cfg);
  ctx.save();
  BACKGROUNDS[style](ctx, t, palette);
  // Scrim: darkens everything, a little more in the middle where the big words sit, so text stays readable.
  const scrim = ctx.createLinearGradient(0, 0, 0, 1280);
  scrim.addColorStop(0, 'rgba(5,6,15,.26)'); scrim.addColorStop(0.5, 'rgba(5,6,15,.38)'); scrim.addColorStop(1, 'rgba(5,6,15,.26)');
  ctx.fillStyle = scrim; ctx.fillRect(0, 0, 720, 1280);
  ctx.restore();
}

function brandMark(ctx, cfg, alpha) {
  withMotion(ctx, { alpha }, () => {
    setFont(ctx, { weight: 800, size: 30, spacing: 3 }); ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(cfg.brand, 50, 88);
  });
}

/** Big opening words, in and out. `lines` are drawn in Anton; the last `accent` words are coloured. */
function hookCard(ctx, t, cfg, { lines, accent = '', from = 0.2, to = 3.0 }) {
  const inP = seg(t, from, from + 0.7); const outP = seg(t, to - 0.5, to);
  withMotion(ctx, { alpha: inP * (1 - outP), dy: (1 - outC(inP)) * 70 - outC(outP) * 60 }, () => {
    let size = 130;
    setFont(ctx, { family: 'Anton', size });
    const widest = Math.max(...lines.map(l => ctx.measureText(l.toUpperCase()).width));
    if (widest > 620) size = Math.floor(size * 620 / widest);
    setFont(ctx, { family: 'Anton', size });
    const step = size * 1.1; const top = 640 - (lines.length * step) / 2 + size * 0.86;
    lines.forEach((line, i) => {
      const text = line.toUpperCase(); const y = top + i * step; ctx.textAlign = 'left';
      const a = accent && i === lines.length - 1 && text.endsWith(accent.toUpperCase()) ? accent.toUpperCase() : '';
      if (a) {
        const head = text.slice(0, text.length - a.length);
        ctx.fillStyle = '#fff'; ctx.fillText(head, 50, y);
        ctx.fillStyle = cfg.accent; ctx.fillText(a, 50 + ctx.measureText(head).width, y);
      } else { ctx.fillStyle = '#fff'; ctx.fillText(text, 50, y); }
    });
  });
}

/** The closing headline, one line of words, the button, the fine print and the address. `s` is when it starts. */
function closeScene(ctx, t, cfg, s) {
  const eIn = seg(t, s, s + 0.8);
  withMotion(ctx, { alpha: eIn, dy: (1 - outC(eIn)) * 60 }, () => {
    let size = 128;
    setFont(ctx, { family: 'Anton', size });
    const widest = Math.max(...cfg.endHeadline.map(l => ctx.measureText(l.toUpperCase()).width));
    if (widest > 620) size = Math.floor(size * 620 / widest);
    setFont(ctx, { family: 'Anton', size });
    const step = size * 1.08;
    cfg.endHeadline.forEach((line, i) => {
      const y = 250 + size * 0.86 + i * step; const text = line.toUpperCase(); ctx.textAlign = 'left';
      const accent = cfg.endAccent && i === cfg.endHeadline.length - 1 && text.endsWith(cfg.endAccent.toUpperCase()) ? cfg.endAccent.toUpperCase() : '';
      if (accent) {
        const head = text.slice(0, text.length - accent.length);
        ctx.fillStyle = '#fff'; ctx.fillText(head, 50, y);
        ctx.fillStyle = cfg.accent; ctx.fillText(accent, 50 + ctx.measureText(head).width, y);
      } else { ctx.fillStyle = '#fff'; ctx.fillText(text, 50, y); }
    });
  });
  const lineP = seg(t, s + 0.9, s + 1.5);
  withMotion(ctx, { alpha: lineP, dy: (1 - outC(lineP)) * 30 }, () => {
    setFont(ctx, { weight: 500, size: 36 }); ctx.fillStyle = '#cfd3dc';
    drawLines(ctx, wrapText(ctx, cfg.endLine, 620), 50, 726, 48.6);
  });
  const bP = seg(t, s + 1.7, s + 2.3);
  const pulse = 1 + 0.025 * Math.sin(Math.max(0, t - (s + 2.6)) * 5.5);
  withMotion(ctx, { alpha: bP, dy: (1 - outC(bP)) * 40, scale: lerp(0.9, 1, outB(bP)) * pulse, cx: 360, cy: 920 }, () => {
    fillRoundRect(ctx, 50, 860, 620, 120, 60, cfg.accent);
    setFont(ctx, { weight: 800, size: 36, spacing: 1 }); ctx.fillStyle = '#0b0d12'; ctx.textAlign = 'center'; ctx.fillText(cfg.cta, 360, 932);
  });
  const sP = seg(t, s + 2.4, s + 3.0);
  withMotion(ctx, { alpha: sP, dy: (1 - outC(sP)) * 20 }, () => {
    setFont(ctx, { weight: 400, size: 25 }); ctx.fillStyle = '#cfd3dc'; ctx.textAlign = 'center'; ctx.fillText(cfg.small, 360, 1036);
  });
  const uP = seg(t, s + 2.8, s + 3.4);
  withMotion(ctx, { alpha: uP, dy: (1 - outC(uP)) * 20 }, () => {
    setFont(ctx, { weight: 800, size: 40 }); ctx.fillStyle = cfg.accent; ctx.textAlign = 'center'; ctx.fillText(cfg.url, 360, 1158);
  });
}

/** "BUILD MY AI BUSINESS FREE" read aloud as a sentence. */
const spoken = text => { const t = String(text).toLowerCase().replace(/\bai\b/g, 'AI'); return t.charAt(0).toUpperCase() + t.slice(1); };

const ROLES = {
  narrator: 'Calm, confident and friendly, like an experienced small-business owner talking to a friend. Natural pace.',
  customer: 'Casual and a little tired, like someone typing a quick question late at night.',
  assistant: 'Warm, clear and helpful, like a friendly receptionist.'
};

module.exports = { BASE_LIMITS, BASE_DEFAULTS, BG_STYLES, cleanBase, backdrop, brandMark, hookCard, closeScene, spoken, ROLES };
