/**
 * "Walkthrough" explainer, about 25 seconds, vertical.
 *
 *   An opening line, then an app on a phone guides someone through three
 *   steps. In each step the guide says what to do, a value is typed into a
 *   field, and a green result appears. A progress bar fills as the steps
 *   finish. The phone leaves and the closing headline and button arrive.
 *
 * For ideas about how something is set up or used: the guided builder, the
 * Business Brain, the dashboard, Marketing Studio, follow-up.
 */
const { clamp, seg, outC, outB, inOut, lerp, typed } = require('../easing.cjs');
const { fillRoundRect, strokeRoundRect, roundRectPath, wrapText, setFont, withMotion } = require('../kit.cjs');
const { BASE_DEFAULTS, cleanBase, backdrop, brandMark, hookCard, closeScene, spoken, ROLES } = require('./shared.cjs');

const STEP_DEFAULTS = [
  { guideSays: 'Tell me about your business. What do you do?', label: 'YOUR BUSINESS', value: 'We repair and replace roofs', result: 'Business details saved' },
  { guideSays: 'Great. Who are your customers?', label: 'YOUR CUSTOMERS', value: 'Homeowners in town', result: 'Customers added to the brain' },
  { guideSays: 'Last step. How should customers reach you?', label: 'CONTACT', value: 'Call or book online', result: 'Your site is ready to review' }
];

const DEFAULTS = {
  ...BASE_DEFAULTS,
  hook: ['Meet the AI', 'Website Professor.'],
  hookAccent: 'Website Professor.',
  guideName: 'AI Website Professor',
  guideLetter: 'P',
  steps: STEP_DEFAULTS,
  sampleLabel: 'SAMPLE SCREEN SHOWN',
  endHeadline: ['Guided from', 'start to finish.'],
  endAccent: 'start to finish.',
  endLine: 'Tell us about your business. The AI Website Professor guides the build.'
};

const LIMITS = { hookAccent: 22, guideName: 28, guideLetter: 1 };
const STEP_LIMITS = { guideSays: 62, label: 22, value: 40, result: 36 };

function normalizeConfig(input = {}) {
  const c = { ...DEFAULTS, ...Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined && v !== null)) };
  for (const [key, max] of Object.entries(LIMITS)) c[key] = String(c[key]).trim().slice(0, max);
  if (!Array.isArray(c.hook) || c.hook.length < 1 || c.hook.length > 3) throw new Error('hook must be one to three short lines');
  c.hook = c.hook.map(l => String(l).trim().slice(0, 24));
  if (!Array.isArray(c.steps) || c.steps.length !== 3) throw new Error('steps must be exactly three');
  c.steps = c.steps.map(step => {
    const out = {};
    for (const [key, max] of Object.entries(STEP_LIMITS)) out[key] = String(step?.[key] ?? '').trim().slice(0, max);
    if (!out.guideSays || !out.value || !out.result) throw new Error('each step needs guideSays, value and result');
    out.label = (out.label || 'DETAILS').toUpperCase();
    return out;
  });
  return cleanBase(c);
}

const STEP_AT = [4.4, 9.0, 13.6];
const STEP_LEN = 4.6;
const CLOSE_AT = 18.6;
const DURATION = CLOSE_AT + 3.4 + 2.2 + 1.2;
const PHONE = { x: 80, y: 120, w: 560, h: 1040, r: 64, border: 10 };
const IN = { x: PHONE.x + PHONE.border, y: PHONE.y + PHONE.border, w: PHONE.w - PHONE.border * 2, h: PHONE.h - PHONE.border * 2 };

function createScene(input) {
  const cfg = normalizeConfig(input);
  const A = cfg.accent;

  function step(ctx, t, i) {
    const s = cfg.steps[i]; const r = t - STEP_AT[i];
    const slideIn = outC(seg(r, -0.1, 0.45)); const slideOut = inOut(seg(r, STEP_LEN - 0.4, STEP_LEN)) * (i < 2 ? 1 : 0);
    const dx = (1 - slideIn) * 540 - slideOut * 540;
    if (r < -0.1 || (i < 2 && r > STEP_LEN)) return;
    ctx.save(); ctx.translate(dx, 0);
    // the guide speaks
    const says = typed(s.guideSays, seg(r, 0.25, 1.9));
    if (says.length) {
      setFont(ctx, { weight: 500, size: 32 });
      const lines = wrapText(ctx, says, 400 - 56); const lh = 40; const h = 36 + lines.length * lh;
      fillRoundRect(ctx, 28, 190, 440, 36 + Math.max(1, wrapText(ctx, s.guideSays, 400 - 56).length) * lh, [30, 30, 30, 8], '#fff');
      ctx.fillStyle = '#11141b'; ctx.textAlign = 'left';
      lines.forEach((line, k) => ctx.fillText(line, 28 + 28, 190 + 18 + lh * (k + 0.5) + 11));
      void h;
    }
    // the field
    const fieldTop = 460;
    const fieldP = seg(r, 1.7, 2.1);
    withMotion(ctx, { alpha: fieldP, dy: (1 - outC(fieldP)) * 24 }, () => {
      setFont(ctx, { weight: 700, size: 22, spacing: 2 }); ctx.fillStyle = '#8b92a1'; ctx.textAlign = 'left'; ctx.fillText(s.label, 40, fieldTop);
      fillRoundRect(ctx, 28, fieldTop + 16, 484, 96, 24, '#181c25');
      const typing = r > 2.1 && r < 3.3;
      strokeRoundRect(ctx, 28, fieldTop + 16, 484, 96, 24, typing ? A : '#2a2d36', typing ? 3 : 2);
      const value = typed(s.value, seg(r, 2.1, 3.3));
      setFont(ctx, { weight: 600, size: 32 }); ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
      let shown = value; while (ctx.measureText(shown).width > 430 && shown.length > 1) shown = shown.slice(1);
      ctx.fillText(shown, 52, fieldTop + 76);
      if (typing && Math.floor(r * 2.4) % 2 === 0) { ctx.fillStyle = A; ctx.fillRect(52 + ctx.measureText(shown).width + 3, fieldTop + 44, 4, 44); }
    });
    // the result
    const resP = seg(r, 3.4, 3.85);
    withMotion(ctx, { alpha: resP, dy: (1 - outC(resP)) * 30, scale: lerp(0.94, 1, outB(resP)), cx: 270, cy: fieldTop + 190 }, () => {
      fillRoundRect(ctx, 28, fieldTop + 150, 484, 84, 28, '#0f2a1d'); strokeRoundRect(ctx, 28, fieldTop + 150, 484, 84, 28, '#2fd47a', 2);
      ctx.strokeStyle = '#2fd47a'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(58, fieldTop + 193); ctx.lineTo(66, fieldTop + 202); ctx.lineTo(80, fieldTop + 182); ctx.stroke();
      setFont(ctx, { weight: 700, size: 27 }); ctx.fillStyle = '#2fd47a'; ctx.textAlign = 'left'; ctx.fillText(s.result, 94, fieldTop + 202);
    });
    ctx.restore();
  }

  function phone(ctx, t) {
    const pIn = seg(t, 3.2, 4.0); const pOut = seg(t, CLOSE_AT - 1.0, CLOSE_AT - 0.2);
    withMotion(ctx, { alpha: 1, dy: (1 - outC(pIn)) * 1300 + inOut(pOut) * -1500, scale: lerp(0.96, 1, outC(pIn)), cx: 360, cy: PHONE.y + PHONE.h / 2 }, () => {
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 80; ctx.shadowOffsetY = 30;
      fillRoundRect(ctx, PHONE.x, PHONE.y, PHONE.w, PHONE.h, PHONE.r, '#11141b'); ctx.restore();
      strokeRoundRect(ctx, PHONE.x, PHONE.y, PHONE.w, PHONE.h, PHONE.r, '#2a2d36', PHONE.border);
      ctx.save(); roundRectPath(ctx, IN.x, IN.y, IN.w, IN.h, PHONE.r - PHONE.border); ctx.clip(); ctx.translate(IN.x, IN.y);
      // header with the guide and the progress
      ctx.fillStyle = '#181c25'; ctx.fillRect(0, 0, 540, 130);
      ctx.fillStyle = '#242936'; ctx.fillRect(0, 129, 540, 1);
      ctx.fillStyle = A; ctx.beginPath(); ctx.arc(57, 55, 29, 0, Math.PI * 2); ctx.fill();
      setFont(ctx, { family: 'Anton', size: 30 }); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(cfg.guideLetter, 57, 66);
      setFont(ctx, { weight: 700, size: 27 }); ctx.textAlign = 'left'; ctx.fillText(cfg.guideName, 106, 52);
      const current = t < STEP_AT[1] - 0.2 ? 1 : t < STEP_AT[2] - 0.2 ? 2 : 3;
      setFont(ctx, { weight: 400, size: 21 }); ctx.fillStyle = '#8b92a1'; ctx.fillText(`Step ${current} of 3`, 106, 84);
      for (let k = 0; k < 3; k += 1) {
        fillRoundRect(ctx, 28 + k * 162, 106, 156, 8, 4, '#2a2d36');
        const done = seg(t, STEP_AT[k] + 3.4, STEP_AT[k] + 3.9);
        const grow = k === 0 || t > STEP_AT[k] ? 1 : 0;
        if (done > 0 || (grow && t > STEP_AT[k])) fillRoundRect(ctx, 28 + k * 162, 106, 156 * Math.max(done, 0.12 * grow), 8, 4, A);
      }
      for (let k = 0; k < 3; k += 1) step(ctx, t, k);
      ctx.restore();
    });
    withMotion(ctx, { alpha: seg(t, 3.8, 4.2) * (1 - seg(t, CLOSE_AT - 1.2, CLOSE_AT - 0.8)) }, () => {
      setFont(ctx, { weight: 400, size: 24, spacing: 1 }); ctx.fillStyle = '#6f7686'; ctx.textAlign = 'center'; ctx.fillText(cfg.sampleLabel, 360, 1220);
    });
  }

  function draw(ctx, t) {
    backdrop(ctx, t, cfg);
    brandMark(ctx, cfg, seg(t, 0, 0.5) * (1 - seg(t, CLOSE_AT - 0.4, CLOSE_AT)));
    hookCard(ctx, t, cfg, { lines: cfg.hook, accent: cfg.hookAccent, from: 0.2, to: 3.0 });
    phone(ctx, t);
    closeScene(ctx, t, cfg, CLOSE_AT);
  }
  return { duration: DURATION, draw, config: cfg };
}

function narration(input) {
  const c = normalizeConfig(input);
  const lines = [{ id: 'open', at: 0.6, role: 'narrator', maxSeconds: 2.4, text: c.hook.join(' ') }];
  c.steps.forEach((s, i) => {
    lines.push({ id: `guide${i + 1}`, at: STEP_AT[i] + 0.3, role: 'assistant', maxSeconds: 2.7, text: s.guideSays });
    lines.push({ id: `result${i + 1}`, at: STEP_AT[i] + 3.45, role: 'narrator', maxSeconds: 1.4, text: s.result });
  });
  lines.push({ id: 'close', at: CLOSE_AT + 0.9, role: 'narrator', maxSeconds: 3.6, text: c.endLine });
  lines.push({ id: 'cta', at: CLOSE_AT + 4.6, role: 'narrator', maxSeconds: 2.0, text: `${spoken(c.cta)}.` });
  return lines;
}

module.exports = { createScene, normalizeConfig, narration, ROLES, DEFAULTS, DURATION };
