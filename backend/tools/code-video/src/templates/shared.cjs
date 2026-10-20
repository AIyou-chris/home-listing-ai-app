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
  accent: '#ff5a36'
};

/** Cuts text to its limit and checks the colour. Throws a plain message on a bad shape. */
function cleanBase(c) {
  for (const [key, max] of Object.entries(BASE_LIMITS)) c[key] = String(c[key]).trim().slice(0, max);
  if (!Array.isArray(c.endHeadline) || c.endHeadline.length < 1 || c.endHeadline.length > 3) throw new Error('endHeadline must be one to three short lines');
  c.endHeadline = c.endHeadline.map(l => String(l).trim().slice(0, 22));
  c.endAccent = String(c.endAccent || '').slice(0, 22);
  if (!/^#[0-9a-f]{6}$/i.test(c.accent)) throw new Error('accent must be a hex colour like #ff5a36');
  return c;
}

function backdrop(ctx) {
  ctx.fillStyle = '#0b0d12'; ctx.fillRect(0, 0, 720, 1280);
  ctx.save(); ctx.translate(360, 1408); ctx.scale(1, 0.95);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 800);
  g.addColorStop(0, 'rgba(255,90,54,.28)'); g.addColorStop(0.6, 'rgba(255,90,54,0)');
  ctx.fillStyle = g; ctx.fillRect(-360, -1408, 720, 1280 * 1.1 + 128); ctx.restore();
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

module.exports = { BASE_LIMITS, BASE_DEFAULTS, cleanBase, backdrop, brandMark, hookCard, closeScene, spoken, ROLES };
