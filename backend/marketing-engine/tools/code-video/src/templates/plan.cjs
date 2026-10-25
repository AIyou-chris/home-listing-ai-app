/**
 * "Plan" explainer, about 23 seconds, vertical.
 *
 *   An opening line, then a plan card on a phone: the plan name, a big price,
 *   four things it includes ticked off one at a time, and two small promises
 *   ("No setup fee"). The phone leaves and the closing headline and button
 *   arrive.
 *
 * For posts about what the plan costs and what it includes.
 */
const { seg, outC, outB, inOut, lerp } = require('../easing.cjs');
const { fillRoundRect, strokeRoundRect, roundRectPath, setFont, withMotion } = require('../kit.cjs');
const { BASE_DEFAULTS, cleanBase, backdrop, brandMark, hookCard, closeScene, spoken, ROLES } = require('./shared.cjs');

const DEFAULTS = {
  ...BASE_DEFAULTS,
  hook: ['One plan.', 'Everything in it.'],
  hookAccent: 'Everything in it.',
  planName: 'Build it yourself',
  price: '$79/month',
  items: ['Answers website chat', 'Answers your phone 24/7', 'Books appointments', 'Follows up and keeps your CRM'],
  perks: ['No setup fee', 'No credit card to start'],
  sampleLabel: 'PLAN SHOWN',
  endHeadline: ['One plan.', 'Does more.'],
  endAccent: 'Does more.',
  endLine: 'One AI Employee for your website chat and phone, with a CRM built in.'
};

const LIMITS = { hookAccent: 22, planName: 26, price: 14 };

function normalizeConfig(input = {}) {
  const c = { ...DEFAULTS, ...Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined && v !== null)) };
  for (const [key, max] of Object.entries(LIMITS)) c[key] = String(c[key]).trim().slice(0, max);
  if (!Array.isArray(c.hook) || c.hook.length < 1 || c.hook.length > 3) throw new Error('hook must be one to three short lines');
  c.hook = c.hook.map(l => String(l).trim().slice(0, 22));
  if (!Array.isArray(c.items) || c.items.length !== 4) throw new Error('items must be exactly four');
  c.items = c.items.map(i => String(i ?? '').trim().slice(0, 32));
  if (c.items.some(i => !i)) throw new Error('each item needs words');
  if (!Array.isArray(c.perks) || c.perks.length < 1 || c.perks.length > 2) throw new Error('perks must be one or two short lines');
  c.perks = c.perks.map(p => String(p ?? '').trim().slice(0, 26)).filter(Boolean);
  if (!c.price) throw new Error('price is needed');
  return cleanBase(c);
}

const PRICE_AT = 4.2;
const ITEM_AT = [7.2, 9.2, 11.2, 13.2];
const PERK_AT = [15.3, 16.2];
const CLOSE_AT = 19.2;
const DURATION = CLOSE_AT + 3.4 + 2.2 + 1.2;
const PHONE = { x: 80, y: 120, w: 560, h: 1040, r: 64, border: 10 };
const IN = { x: PHONE.x + PHONE.border, y: PHONE.y + PHONE.border, w: PHONE.w - PHONE.border * 2, h: PHONE.h - PHONE.border * 2 };

function createScene(input) {
  const cfg = normalizeConfig(input);
  const A = cfg.accent;
  const [whole, per] = (() => { const m = cfg.price.match(/^(.*?)(\/.*)$/); return m ? [m[1], m[2]] : [cfg.price, '']; })();

  function screen(ctx, t) {
    ctx.fillStyle = '#181c25'; ctx.fillRect(0, 0, 540, 130);
    ctx.fillStyle = '#242936'; ctx.fillRect(0, 129, 540, 1);
    ctx.fillStyle = A; ctx.beginPath(); ctx.arc(57, 65, 29, 0, Math.PI * 2); ctx.fill();
    setFont(ctx, { family: 'Anton', size: 30 }); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText('A', 57, 76);
    setFont(ctx, { weight: 700, size: 27 }); ctx.textAlign = 'left'; ctx.fillText(cfg.planName, 106, 74);
    // the price
    const pP = seg(t, PRICE_AT, PRICE_AT + 0.6);
    withMotion(ctx, { alpha: pP, dy: (1 - outC(pP)) * 40, scale: lerp(0.9, 1, outB(pP)), cx: 270, cy: 260 }, () => {
      let size = 150; setFont(ctx, { family: 'Anton', size });
      const full = () => { setFont(ctx, { family: 'Anton', size }); const w1 = ctx.measureText(whole).width; setFont(ctx, { weight: 600, size: Math.round(size * 0.32) }); return w1 + ctx.measureText(per).width + 8; };
      while (full() > 470 && size > 60) size -= 6;
      const w1 = (setFont(ctx, { family: 'Anton', size }), ctx.measureText(whole).width);
      setFont(ctx, { weight: 600, size: Math.round(size * 0.32) });
      const total = w1 + ctx.measureText(per).width + 8; const x0 = (540 - total) / 2;
      setFont(ctx, { family: 'Anton', size }); ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(whole, x0, 290);
      setFont(ctx, { weight: 600, size: Math.round(size * 0.32) }); ctx.fillStyle = '#8b92a1'; ctx.fillText(per, x0 + w1 + 8, 290);
    });
    // what it includes
    cfg.items.forEach((item, i) => {
      const r = seg(t, ITEM_AT[i], ITEM_AT[i] + 0.5); const y = 360 + i * 104;
      withMotion(ctx, { alpha: r, dy: (1 - outC(r)) * 30 }, () => {
        fillRoundRect(ctx, 28, y, 484, 84, 26, '#181c25');
        ctx.fillStyle = '#0f2a1d'; ctx.beginPath(); ctx.arc(76, y + 42, 22, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#2fd47a'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(66, y + 43); ctx.lineTo(73, y + 51); ctx.lineTo(87, y + 33); ctx.stroke();
        let size = 29; setFont(ctx, { weight: 600, size });
        while (ctx.measureText(item).width > 390 && size > 18) { size -= 1; setFont(ctx, { weight: 600, size }); }
        ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(item, 118, y + 52);
      });
    });
    // the small promises
    cfg.perks.forEach((perk, i) => {
      const r = seg(t, PERK_AT[i], PERK_AT[i] + 0.5); const y = 800 + i * 84;
      withMotion(ctx, { alpha: r, dy: (1 - outC(r)) * 24, scale: lerp(0.95, 1, outB(r)), cx: 270, cy: y + 30 }, () => {
        fillRoundRect(ctx, 28, y, 484, 64, 32, '#0f2a1d'); strokeRoundRect(ctx, 28, y, 484, 64, 32, '#2fd47a', 2);
        setFont(ctx, { weight: 700, size: 27 }); ctx.fillStyle = '#2fd47a'; ctx.textAlign = 'center'; ctx.fillText(perk, 270, y + 42);
      });
    });
  }

  function phone(ctx, t) {
    const pIn = seg(t, 2.8, 3.6); const pOut = seg(t, CLOSE_AT - 1.0, CLOSE_AT - 0.2);
    withMotion(ctx, { alpha: 1, dy: (1 - outC(pIn)) * 1300 + inOut(pOut) * -1500, scale: lerp(0.96, 1, outC(pIn)), cx: 360, cy: PHONE.y + PHONE.h / 2 }, () => {
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 80; ctx.shadowOffsetY = 30;
      fillRoundRect(ctx, PHONE.x, PHONE.y, PHONE.w, PHONE.h, PHONE.r, '#11141b'); ctx.restore();
      strokeRoundRect(ctx, PHONE.x, PHONE.y, PHONE.w, PHONE.h, PHONE.r, '#2a2d36', PHONE.border);
      ctx.save(); roundRectPath(ctx, IN.x, IN.y, IN.w, IN.h, PHONE.r - PHONE.border); ctx.clip(); ctx.translate(IN.x, IN.y);
      screen(ctx, t);
      ctx.restore();
    });
    withMotion(ctx, { alpha: seg(t, 3.6, 4.0) * (1 - seg(t, CLOSE_AT - 1.2, CLOSE_AT - 0.8)) }, () => {
      setFont(ctx, { weight: 400, size: 24, spacing: 1 }); ctx.fillStyle = '#6f7686'; ctx.textAlign = 'center'; ctx.fillText(cfg.sampleLabel, 360, 1220);
    });
  }

  function draw(ctx, t) {
    backdrop(ctx, t, cfg);
    brandMark(ctx, cfg, seg(t, 0, 0.5) * (1 - seg(t, CLOSE_AT - 0.4, CLOSE_AT)));
    hookCard(ctx, t, cfg, { lines: cfg.hook, accent: cfg.hookAccent, from: 0.2, to: 2.8 });
    phone(ctx, t);
    closeScene(ctx, t, cfg, CLOSE_AT);
  }
  return { duration: DURATION, draw, config: cfg };
}

/** "$79/month" read as a person would say it. */
const spokenPrice = price => String(price).replace(/\/\s*mo(?:nth)?\b/i, ' a month');

function narration(input) {
  const c = normalizeConfig(input);
  const lines = [
    { id: 'open', at: 0.6, role: 'narrator', maxSeconds: 2.0, text: c.hook.join(' ') },
    { id: 'price', at: PRICE_AT + 0.1, role: 'narrator', maxSeconds: 2.8, text: `${c.planName}. ${spokenPrice(c.price)}.` }
  ];
  c.items.forEach((item, i) => lines.push({ id: `item${i + 1}`, at: ITEM_AT[i] + 0.1, role: 'narrator', maxSeconds: 1.9, text: item }));
  lines.push({ id: 'perks', at: PERK_AT[0] + 0.1, role: 'narrator', maxSeconds: 3.2, text: c.perks.join('. ') + '.' });
  lines.push({ id: 'close', at: CLOSE_AT + 0.9, role: 'narrator', maxSeconds: 3.6, text: c.endLine });
  lines.push({ id: 'cta', at: CLOSE_AT + 4.6, role: 'narrator', maxSeconds: 2.0, text: `${spoken(c.cta)}.` });
  return lines;
}

module.exports = { createScene, normalizeConfig, narration, ROLES, DEFAULTS, DURATION };
