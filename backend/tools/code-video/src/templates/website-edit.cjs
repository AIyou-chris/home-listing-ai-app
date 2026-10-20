/**
 * "Website edit" explainer, about 23 seconds, vertical.
 *
 *   An opening line, then a sample business website appears. A cursor clicks
 *   its headline, the old words are deleted and new ones typed, and "Saved"
 *   pops up. A second detail (hours, a service) is changed the same way. The
 *   page leaves and the closing headline and button arrive.
 *
 * For ideas about changing your own website: no developer, no waiting.
 */
const { clamp, seg, outC, outB, inOut, lerp, typed } = require('../easing.cjs');
const { fillRoundRect, strokeRoundRect, roundRectPath, wrapText, setFont, drawLines, withMotion } = require('../kit.cjs');
const { BASE_DEFAULTS, cleanBase, backdrop, brandMark, hookCard, closeScene, spoken, ROLES } = require('./shared.cjs');

const DEFAULTS = {
  ...BASE_DEFAULTS,
  hook: ['Your new', 'web guy is you.'],
  hookAccent: 'web guy is you.',
  business: 'Sample Roofing Co.',
  domain: 'sampleroofing.com',
  headlineOld: 'Quality roofing since 1998',
  headlineNew: 'Free roof checks this month',
  sub: 'Repairs, replacements and inspections for homes in town.',
  button: 'Get a free quote',
  detailLabel: 'Hours',
  detailOld: 'Mon to Fri, 8 to 5',
  detailNew: 'Mon to Sat, 7 to 6',
  endHeadline: ['Change it', 'in plain words.'],
  endAccent: 'plain words.',
  endLine: 'Edit your own website by typing. No developer, no waiting.'
};
const LIMITS = { hookAccent: 22, business: 28, domain: 30, headlineOld: 60, headlineNew: 60, sub: 70, button: 22, detailLabel: 14, detailOld: 30, detailNew: 30 };

function normalizeConfig(input = {}) {
  const c = { ...DEFAULTS, ...Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined && v !== null)) };
  for (const [key, max] of Object.entries(LIMITS)) c[key] = String(c[key]).trim().slice(0, max);
  if (!Array.isArray(c.hook) || c.hook.length < 1 || c.hook.length > 3) throw new Error('hook must be one to three short lines');
  c.hook = c.hook.map(l => String(l).trim().slice(0, 22));
  return cleanBase(c);
}

const DURATION = 23.4;
const FRAME = { x: 60, y: 140, w: 600, h: 1000, r: 36 };
const CLOSE_AT = 16.2;

function createScene(input) {
  const cfg = normalizeConfig(input);
  const A = cfg.accent;
  const X = FRAME.x + 30; const W = FRAME.w - 60;

  /** Text that is deleted, then typed: returns what is showing at time t. */
  function editing(oldText, newText, t, eraseFrom, typeFrom, typeTo) {
    if (t < eraseFrom) return oldText;
    if (t < typeFrom) return oldText.slice(0, Math.floor(oldText.length * (1 - seg(t, eraseFrom, typeFrom))));
    return typed(newText, seg(t, typeFrom, typeTo));
  }

  function site(ctx, t) {
    // browser chrome
    fillRoundRect(ctx, FRAME.x, FRAME.y, FRAME.w, FRAME.h, FRAME.r, '#0f1218');
    strokeRoundRect(ctx, FRAME.x, FRAME.y, FRAME.w, FRAME.h, FRAME.r, '#2a2d36', 6);
    ctx.save(); roundRectPath(ctx, FRAME.x + 3, FRAME.y + 3, FRAME.w - 6, FRAME.h - 6, FRAME.r - 3); ctx.clip();
    ctx.fillStyle = '#181c25'; ctx.fillRect(FRAME.x, FRAME.y, FRAME.w, 84);
    ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(FRAME.x + 38 + i * 26, FRAME.y + 42, 8, 0, Math.PI * 2); ctx.fill(); });
    fillRoundRect(ctx, FRAME.x + 140, FRAME.y + 22, 400, 42, 21, '#0f1218');
    setFont(ctx, { weight: 500, size: 21 }); ctx.fillStyle = '#8b92a1'; ctx.textAlign = 'center'; ctx.fillText(cfg.domain, FRAME.x + 340, FRAME.y + 51);

    // the sample website
    const top = FRAME.y + 84;
    const hero = ctx.createLinearGradient(0, top, 0, top + 560);
    hero.addColorStop(0, '#1d2431'); hero.addColorStop(1, '#141922');
    ctx.fillStyle = hero; ctx.fillRect(FRAME.x, top, FRAME.w, 560);
    setFont(ctx, { weight: 800, size: 22, spacing: 2 }); ctx.fillStyle = A; ctx.textAlign = 'left'; ctx.fillText(cfg.business.toUpperCase(), X, top + 56);

    const headline = editing(cfg.headlineOld, cfg.headlineNew, t, 6.0, 6.9, 9.4);
    setFont(ctx, { weight: 800, size: 46 });
    const hLines = wrapText(ctx, headline || ' ', W - 20);
    const clickP = seg(t, 5.5, 5.8);
    const editing1 = t >= 5.6 && t < 9.6;
    const hTop = top + 100; const hBottom = hTop + 2 * 56 + 14; // room for two lines
    if (editing1) {
      ctx.save(); ctx.setLineDash([8, 6]); ctx.strokeStyle = A; ctx.lineWidth = 2.5;
      roundRectPath(ctx, X - 12, hTop - 12, W + 24, hBottom - hTop + 18, 14); ctx.stroke(); ctx.restore();
      withMotion(ctx, { alpha: seg(t, 5.7, 6.0) }, () => { fillRoundRect(ctx, X + W - 138, hTop - 58, 150, 36, 18, A); setFont(ctx, { weight: 700, size: 19 }); ctx.fillStyle = '#0b0d12'; ctx.textAlign = 'center'; ctx.fillText('Edit text', X + W - 63, hTop - 33); });
    }
    setFont(ctx, { weight: 800, size: 46 }); ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
    drawLines(ctx, hLines, X, hTop + 42, 56);
    // caret while typing
    if (editing1 && Math.floor(t * 2.2) % 2 === 0 && t > 6.0) {
      const last = hLines[hLines.length - 1] || ''; const cx = X + ctx.measureText(last).width + 4; const cy = hTop + 42 + (hLines.length - 1) * 56;
      ctx.fillStyle = A; ctx.fillRect(cx, cy - 38, 4, 44);
    }
    setFont(ctx, { weight: 400, size: 25 }); ctx.fillStyle = '#9aa1b0';
    drawLines(ctx, wrapText(ctx, cfg.sub, W), X, top + 290, 36);
    fillRoundRect(ctx, X, top + 390, 260, 66, 33, A);
    setFont(ctx, { weight: 800, size: 25 }); ctx.fillStyle = '#0b0d12'; ctx.textAlign = 'center'; ctx.fillText(cfg.button, X + 130, top + 432);

    // the detail row
    const dTop = top + 600;
    ctx.fillStyle = '#10141b'; ctx.fillRect(FRAME.x, top + 560, FRAME.w, FRAME.h - 84 - 560);
    const detail = editing(cfg.detailOld, cfg.detailNew, t, 11.6, 12.3, 13.6);
    const editing2 = t >= 11.1 && t < 14.0;
    fillRoundRect(ctx, X, dTop, W, 120, 22, '#181c25');
    if (editing2) { ctx.save(); ctx.setLineDash([8, 6]); ctx.strokeStyle = A; ctx.lineWidth = 2.5; roundRectPath(ctx, X - 4, dTop - 4, W + 8, 128, 26); ctx.stroke(); ctx.restore(); }
    setFont(ctx, { weight: 700, size: 22, spacing: 2 }); ctx.fillStyle = '#8b92a1'; ctx.textAlign = 'left'; ctx.fillText(cfg.detailLabel.toUpperCase(), X + 28, dTop + 46);
    setFont(ctx, { weight: 700, size: 36 }); ctx.fillStyle = '#fff'; ctx.fillText(detail, X + 28, dTop + 92);
    if (editing2 && Math.floor(t * 2.2) % 2 === 0 && t > 12.3) { const cx = X + 28 + ctx.measureText(detail).width + 4; ctx.fillStyle = A; ctx.fillRect(cx, dTop + 58, 4, 42); }
    setFont(ctx, { weight: 400, size: 22 }); ctx.fillStyle = '#6f7686'; ctx.textAlign = 'center'; ctx.fillText(cfg.sampleLabel, FRAME.x + FRAME.w / 2, FRAME.y + FRAME.h - 34);

    // the "Saved" messages
    for (const [from, to] of [[9.7, 11.3], [13.7, 15.2]]) {
      const p = seg(t, from, from + 0.35) * (1 - seg(t, to - 0.35, to));
      withMotion(ctx, { alpha: p, dy: (1 - outC(seg(t, from, from + 0.35))) * -30 }, () => {
        fillRoundRect(ctx, FRAME.x + FRAME.w / 2 - 110, FRAME.y + 100, 220, 56, 28, '#0f2a1d');
        strokeRoundRect(ctx, FRAME.x + FRAME.w / 2 - 110, FRAME.y + 100, 220, 56, 28, '#2fd47a', 2);
        ctx.strokeStyle = '#2fd47a'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(FRAME.x + FRAME.w / 2 - 70, FRAME.y + 130); ctx.lineTo(FRAME.x + FRAME.w / 2 - 62, FRAME.y + 138); ctx.lineTo(FRAME.x + FRAME.w / 2 - 48, FRAME.y + 120); ctx.stroke();
        setFont(ctx, { weight: 700, size: 25 }); ctx.fillStyle = '#2fd47a'; ctx.textAlign = 'left'; ctx.fillText('Saved', FRAME.x + FRAME.w / 2 - 30, FRAME.y + 138);
      });
    }
    ctx.restore();
  }

  function cursor(ctx, t) {
    // from the corner to the headline, then to the detail row
    const first = inOut(seg(t, 4.5, 5.5)); const second = inOut(seg(t, 10.2, 11.0));
    let x = lerp(600, 280, first); let y = lerp(1100, 330, first);
    x = lerp(x, 360, second); y = lerp(y, 780, second);
    const tap1 = seg(t, 5.5, 5.85); const tap2 = seg(t, 11.0, 11.35);
    const alpha = seg(t, 4.3, 4.6) * (1 - seg(t, 14.6, 15.0));
    withMotion(ctx, { alpha, cx: x, cy: y, scale: 1 - 0.15 * Math.sin(Math.PI * clamp(Math.max(tap1, tap2) === tap1 ? tap1 : tap2)) }, () => {
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#0b0d12'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 40); ctx.lineTo(x + 10, y + 31); ctx.lineTo(x + 19, y + 50); ctx.lineTo(x + 27, y + 46); ctx.lineTo(x + 18, y + 28); ctx.lineTo(x + 31, y + 27); ctx.closePath(); ctx.fill(); ctx.stroke();
    });
    for (const [tap, cx, cy] of [[tap1, 280, 330], [tap2, 360, 780]]) {
      if (tap > 0 && tap < 1) { ctx.save(); ctx.globalAlpha = 1 - tap; ctx.strokeStyle = A; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, 30 * (1 + tap * 1.6), 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    }
  }

  function draw(ctx, t) {
    backdrop(ctx);
    brandMark(ctx, cfg, seg(t, 0, 0.5) * (1 - seg(t, CLOSE_AT - 0.4, CLOSE_AT)));
    hookCard(ctx, t, cfg, { lines: cfg.hook, accent: cfg.hookAccent, from: 0.2, to: 3.0 });
    const inP = seg(t, 3.2, 4.0); const outP = seg(t, 15.2, 16.0);
    withMotion(ctx, { alpha: 1, dy: (1 - outC(inP)) * 1200 + inOut(outP) * -1400, scale: lerp(0.96, 1, outC(inP)), cx: 360, cy: FRAME.y + FRAME.h / 2 }, () => { site(ctx, t); cursor(ctx, t); });
    closeScene(ctx, t, cfg, CLOSE_AT);
  }

  return { duration: DURATION, draw, config: cfg };
}

function narration(input) {
  const c = normalizeConfig(input);
  return [
    { id: 'open', at: 0.6, role: 'narrator', maxSeconds: 2.4, text: c.hook.join(' ') },
    { id: 'click', at: 4.6, role: 'narrator', maxSeconds: 2.0, text: 'Click any words on your website.' },
    { id: 'type', at: 7.0, role: 'narrator', maxSeconds: 2.6, text: 'Type what you want it to say.' },
    { id: 'saved', at: 9.9, role: 'narrator', maxSeconds: 1.2, text: 'Saved.' },
    { id: 'detail', at: 11.2, role: 'narrator', maxSeconds: 2.6, text: `Change your ${c.detailLabel.toLowerCase()} the same way.` },
    { id: 'nodev', at: 13.9, role: 'narrator', maxSeconds: 2.0, text: 'No developer. No waiting.' },
    { id: 'close', at: CLOSE_AT + 0.9, role: 'narrator', maxSeconds: 3.6, text: c.endLine },
    { id: 'cta', at: CLOSE_AT + 4.6, role: 'narrator', maxSeconds: 2.0, text: `${spoken(c.cta)}.` }
  ];
}

module.exports = { createScene, normalizeConfig, narration, ROLES, DEFAULTS, DURATION };
