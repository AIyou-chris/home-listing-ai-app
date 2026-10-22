/**
 * "Chat answer" explainer, 18.5 seconds, vertical.
 *
 *   A clock and a CLOSED sign, then a phone slides up. A customer's question
 *   types in, the assistant answers, a time option is tapped, the booking is
 *   confirmed and a "saved" card slides in. The phone leaves and a closing
 *   headline and button arrive.
 *
 * Everything on screen comes from the config, so the same scene explains
 * different ideas. All text is clamped so nothing can overflow its box.
 */
const { clamp, seg, outC, outB, inOut, lerp, typed } = require('../easing.cjs');
const { fillRoundRect, strokeRoundRect, roundRectPath, wrapText, setFont, drawLines, withMotion } = require('../kit.cjs');

const DEFAULTS = {
  brand: 'AN AI YOU',
  timeLabel: '11:38',
  timeSuffix: 'PM',
  closedLabel: 'CLOSED',
  business: 'Sample Roofing Co.',
  closedLine: 'Closed for the night. Customers still ask.',
  assistantLabel: 'AI Employee · online',
  avatarLetter: 'R',
  question: 'Can you look at my roof on Thursday?',
  answer: 'Yes. I have Thursday at 10 AM or 2 PM open.',
  options: ['10 AM', '2 PM'],
  booked: 'Booked. Thursday, 10 AM.',
  leadTitle: 'Lead saved to your CRM',
  leadLines: ['Roof visit · Thursday 10 AM', 'Name and phone captured', 'Follow-up text scheduled'],
  sampleLabel: 'SAMPLE BUSINESS SHOWN',
  endHeadline: ['An answer', 'at 11:38 PM.'],
  endAccent: '11:38 PM.',
  endLine: 'Your AI Employee answers, books it and saves the lead while you sleep.',
  cta: 'BUILD MY AI BUSINESS FREE',
  small: 'No credit card. Build it. Test it. Decide when you are ready.',
  url: 'anaiyou.com',
  accent: '#ff5a36'
};

const LIMITS = { brand: 20, timeLabel: 8, timeSuffix: 3, closedLabel: 10, business: 28, closedLine: 52, assistantLabel: 30, avatarLetter: 1, question: 70, answer: 90, booked: 40, leadTitle: 34, sampleLabel: 30, endLine: 110, cta: 30, small: 80, url: 30 };

/** The config with defaults filled in and every text cut to fit. Throws on the wrong shape. */
function normalizeConfig(input = {}) {
  const c = { ...DEFAULTS, ...Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined && v !== null)) };
  for (const [key, max] of Object.entries(LIMITS)) c[key] = String(c[key]).trim().slice(0, max);
  if (!Array.isArray(c.options) || c.options.length !== 2) throw new Error('options must be exactly two short labels');
  c.options = c.options.map(o => String(o).trim().slice(0, 12));
  if (!Array.isArray(c.leadLines) || c.leadLines.length < 1 || c.leadLines.length > 3) throw new Error('leadLines must be one to three short lines');
  c.leadLines = c.leadLines.map(l => String(l).trim().slice(0, 36));
  if (!Array.isArray(c.endHeadline) || c.endHeadline.length < 1 || c.endHeadline.length > 3) throw new Error('endHeadline must be one to three short lines');
  c.endHeadline = c.endHeadline.map(l => String(l).trim().slice(0, 24));
  c.endAccent = String(c.endAccent || '').slice(0, 24);
  if (!/^#[0-9a-f]{6}$/i.test(c.accent)) throw new Error('accent must be a hex colour like #ff5a36');
  return c;
}

const DURATION = 20.5;
const PHONE = { x: 80, y: 120, w: 560, h: 1040, r: 64, border: 10 };
const IN = { x: PHONE.x + PHONE.border, y: PHONE.y + PHONE.border, w: PHONE.w - PHONE.border * 2, h: PHONE.h - PHONE.border * 2 };

function createScene(input) {
  const cfg = normalizeConfig(input);
  const A = cfg.accent;

  /** A chat bubble. Returns its height so callers can stack things. */
  function bubble(ctx, { text, x, y, w, fill, color, radius, size = 34 }) {
    setFont(ctx, { weight: 500, size });
    const lh = size * 1.32;
    const lines = wrapText(ctx, text, w - 60);
    const h = 44 + lines.length * lh;
    fillRoundRect(ctx, x, y, w, h, radius, fill);
    ctx.fillStyle = color;
    lines.forEach((line, i) => { ctx.textAlign = 'left'; ctx.fillText(line, x + 30, y + 22 + lh * (i + 0.5) + size * 0.34); });
    return h;
  }

  function sceneA(ctx, t) {
    const aIn = seg(t, 0.1, 0.9); const aOut = seg(t, 2.4, 3.0);
    // the sign
    const swing = Math.sin(t * 4.2) * 7 * Math.exp(-Math.max(0, t - 0.5) * 0.5);
    const signIn = seg(t, 0.2, 0.7);
    withMotion(ctx, { alpha: signIn * (1 - aOut), dy: (1 - outC(seg(t, 0.2, 0.9))) * -160, cx: 360, cy: 90, rotate: (swing * Math.PI) / 180 }, () => {
      ctx.fillStyle = '#555'; ctx.fillRect(358, 90, 4, 70);
      fillRoundRect(ctx, 210, 160, 300, 108, 16, '#14171f');
      strokeRoundRect(ctx, 210, 160, 300, 108, 16, A, 4);
      setFont(ctx, { family: 'Anton', size: 58, spacing: 4 });
      ctx.fillStyle = A; ctx.textAlign = 'center'; ctx.fillText(cfg.closedLabel, 362, 238);
    });
    // the clock
    withMotion(ctx, { alpha: aIn * (1 - aOut), dy: -outC(aOut) * 120, scale: lerp(0.85, 1, outB(aIn)), cx: 360, cy: 450 }, () => {
      setFont(ctx, { family: 'Anton', size: 230, spacing: 2 });
      const w1 = ctx.measureText(cfg.timeLabel).width;
      setFont(ctx, { family: 'Anton', size: 90 });
      const w2 = ctx.measureText(cfg.timeSuffix).width;
      const total = w1 + 14 + w2; const left = 360 - total / 2;
      setFont(ctx, { family: 'Anton', size: 230, spacing: 2 });
      ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(cfg.timeLabel, left, 515);
      setFont(ctx, { family: 'Anton', size: 90 });
      ctx.fillStyle = A; ctx.fillText(cfg.timeSuffix, left + w1 + 14, 515);
    });
    const bizP = seg(t, 0.8, 1.4) * (1 - aOut);
    withMotion(ctx, { alpha: bizP, dy: (1 - outC(seg(t, 0.8, 1.4))) * 20 }, () => {
      setFont(ctx, { weight: 600, size: 40 }); ctx.fillStyle = '#cfd3dc'; ctx.textAlign = 'center'; ctx.fillText(cfg.business, 360, 676);
    });
    const subP = seg(t, 1.3, 1.9) * (1 - aOut);
    withMotion(ctx, { alpha: subP, dy: (1 - outC(seg(t, 1.3, 1.9))) * 20 }, () => {
      setFont(ctx, { weight: 400, size: 34 }); ctx.fillStyle = '#8b92a1'; ctx.textAlign = 'center'; ctx.fillText(cfg.closedLine, 360, 744);
    });
  }

  function phone(ctx, t) {
    const pIn = seg(t, 3.2, 4.0); const pOut = seg(t, 12.7, 13.5);
    const dy = (1 - outC(pIn)) * 1300 + inOut(pOut) * -1500;
    withMotion(ctx, { alpha: 1, dy, scale: lerp(0.96, 1, outC(pIn)), cx: 360, cy: PHONE.y + PHONE.h / 2 }, () => {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 80; ctx.shadowOffsetY = 30;
      fillRoundRect(ctx, PHONE.x, PHONE.y, PHONE.w, PHONE.h, PHONE.r, '#11141b');
      ctx.restore();
      strokeRoundRect(ctx, PHONE.x, PHONE.y, PHONE.w, PHONE.h, PHONE.r, '#2a2d36', PHONE.border);
      ctx.save();
      roundRectPath(ctx, IN.x, IN.y, IN.w, IN.h, PHONE.r - PHONE.border); ctx.clip();
      ctx.translate(IN.x, IN.y);

      ctx.fillStyle = '#181c25'; ctx.fillRect(0, 0, 540, 110);
      ctx.fillStyle = '#242936'; ctx.fillRect(0, 109, 540, 1);
      ctx.fillStyle = A; ctx.beginPath(); ctx.arc(57, 55, 29, 0, Math.PI * 2); ctx.fill();
      setFont(ctx, { family: 'Anton', size: 30 }); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(cfg.avatarLetter, 57, 66);
      setFont(ctx, { weight: 700, size: 27 }); ctx.textAlign = 'left'; ctx.fillText(cfg.business, 106, 52);
      ctx.fillStyle = '#2fd47a'; ctx.beginPath(); ctx.arc(112, 75, 5.5, 0, Math.PI * 2); ctx.fill();
      setFont(ctx, { weight: 400, size: 21 }); ctx.fillStyle = '#8b92a1'; ctx.fillText(cfg.assistantLabel, 126, 82);

      // the question types in
      const qText = typed(cfg.question, seg(t, 4.3, 6.1));
      if (qText.length) { setFont(ctx, { weight: 500, size: 34 }); bubble(ctx, { text: qText, x: 540 - 28 - 440, y: 160, w: 440, fill: '#2d3340', color: '#fff', radius: [32, 32, 8, 32] }); }
      // typing dots
      if (t > 6.3 && t < 7.1) {
        withMotion(ctx, { alpha: seg(t, 6.3, 6.5) }, () => {
          fillRoundRect(ctx, 28, 360, 140, 70, [32, 32, 32, 8], '#fff');
          ctx.fillStyle = '#9aa1b0';
          [41, 70, 99].forEach((cx, i) => { ctx.beginPath(); ctx.arc(cx, 395 + Math.sin(t * 9 - i * 0.9) * -7, 7, 0, Math.PI * 2); ctx.fill(); });
        });
      }
      // the answer types in
      const aText = typed(cfg.answer, seg(t, 7.1, 9.0));
      if (aText.length) bubble(ctx, { text: aText, x: 28, y: 340, w: 470, fill: '#fff', color: '#11141b', radius: [32, 32, 32, 8] });

      // the two options
      const picked = t > 10.85;
      cfg.options.forEach((label, i) => {
        const p = seg(t, 9.2 + i * 0.1, 9.7 + i * 0.1);
        const chosen = i === 0;
        const faded = picked && !chosen ? 0.25 : 1;
        withMotion(ctx, { alpha: p * faded, dy: (1 - outC(p)) * 18, scale: lerp(0.9, 1, outB(p)), cx: 28 + i * 234 + 105, cy: 555 }, () => {
          if (picked && chosen) fillRoundRect(ctx, 28 + i * 234, 520, 210, 70, 35, A);
          strokeRoundRect(ctx, 28 + i * 234, 520, 210, 70, 35, A, 3);
          setFont(ctx, { weight: 700, size: 29 }); ctx.fillStyle = picked && chosen ? '#0b0d12' : A; ctx.textAlign = 'center';
          ctx.fillText(label, 28 + i * 234 + 105, 520 + 45);
        });
      });
      // booked
      const okP = seg(t, 11.3, 11.9);
      withMotion(ctx, { alpha: okP, dy: (1 - outC(okP)) * 22, scale: lerp(0.94, 1, outB(okP)), cx: 540 - 28 - 240, cy: 670 }, () => {
        bubble(ctx, { text: cfg.booked, x: 540 - 28 - 480, y: 630, w: 480, fill: A, color: '#fff', radius: [32, 32, 8, 32] });
      });
      // lead saved
      const leadP = seg(t, 12.0, 12.7);
      withMotion(ctx, { alpha: leadP, dy: (1 - outC(leadP)) * 40, scale: lerp(0.96, 1, outB(leadP)), cx: 270, cy: 880 }, () => {
        const h = 24 + 34 + 10 + cfg.leadLines.length * 39 + 24;
        fillRoundRect(ctx, 28, 780, 484, h, 28, '#0f2a1d');
        strokeRoundRect(ctx, 28, 780, 484, h, 28, '#2fd47a', 2);
        ctx.strokeStyle = '#2fd47a'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(56, 818); ctx.lineTo(63, 826); ctx.lineTo(76, 808); ctx.stroke();
        setFont(ctx, { weight: 700, size: 28 }); ctx.fillStyle = '#2fd47a'; ctx.textAlign = 'left'; ctx.fillText(cfg.leadTitle, 86, 826);
        setFont(ctx, { weight: 400, size: 26 }); ctx.fillStyle = '#d9f5e6';
        cfg.leadLines.forEach((line, i) => ctx.fillText(line, 56, 780 + 24 + 34 + 10 + 29 + i * 39));
      });
      ctx.restore();
    });
    // the tap, drawn over the phone
    const mv = inOut(seg(t, 9.9, 10.7)); const tap = seg(t, 10.75, 11.15);
    const fx = lerp(560, 223, mv); const fy = lerp(1010, 688, mv);
    const fingAlpha = seg(t, 9.8, 10.0) * (1 - seg(t, 11.2, 11.6));
    withMotion(ctx, { alpha: fingAlpha, scale: 1 - 0.18 * Math.sin(Math.PI * clamp(tap)), cx: fx, cy: fy }, () => {
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(fx, fy, 30, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
    });
    if (tap > 0 && tap < 1) {
      ctx.save(); ctx.globalAlpha = 1 - tap; ctx.strokeStyle = A; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(223, 688, 30 * (1 + tap * 2.2), 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    // label under the phone
    withMotion(ctx, { alpha: seg(t, 3.8, 4.2) * (1 - seg(t, 12.4, 12.8)) }, () => {
      setFont(ctx, { weight: 400, size: 24, spacing: 1 }); ctx.fillStyle = '#6f7686'; ctx.textAlign = 'center'; ctx.fillText(cfg.sampleLabel, 360, 1220);
    });
  }

  function close(ctx, t) {
    const eIn = seg(t, 13.6, 14.4);
    withMotion(ctx, { alpha: eIn, dy: (1 - outC(eIn)) * 60 }, () => {
      // Shrink the headline until its widest line fits the frame, so a long
      // line is smaller rather than cut off at the edge.
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
          ctx.fillStyle = A; ctx.fillText(accent, 50 + ctx.measureText(head).width, y);
        } else { ctx.fillStyle = '#fff'; ctx.fillText(text, 50, y); }
      });
    });
    const lineP = seg(t, 14.5, 15.1);
    withMotion(ctx, { alpha: lineP, dy: (1 - outC(lineP)) * 30 }, () => {
      setFont(ctx, { weight: 500, size: 36 }); ctx.fillStyle = '#cfd3dc';
      drawLines(ctx, wrapText(ctx, cfg.endLine, 620), 50, 726, 48.6);
    });
    const bP = seg(t, 15.3, 15.9);
    const pulse = 1 + 0.025 * Math.sin(Math.max(0, t - 16.2) * 5.5);
    withMotion(ctx, { alpha: bP, dy: (1 - outC(bP)) * 40, scale: lerp(0.9, 1, outB(bP)) * pulse, cx: 360, cy: 920 }, () => {
      fillRoundRect(ctx, 50, 860, 620, 120, 60, A);
      setFont(ctx, { weight: 800, size: 36, spacing: 1 }); ctx.fillStyle = '#0b0d12'; ctx.textAlign = 'center'; ctx.fillText(cfg.cta, 360, 932);
    });
    const sP = seg(t, 16.0, 16.6);
    withMotion(ctx, { alpha: sP, dy: (1 - outC(sP)) * 20 }, () => {
      setFont(ctx, { weight: 400, size: 25 }); ctx.fillStyle = '#cfd3dc'; ctx.textAlign = 'center'; ctx.fillText(cfg.small, 360, 1036);
    });
    const uP = seg(t, 16.4, 17.0);
    withMotion(ctx, { alpha: uP, dy: (1 - outC(uP)) * 20 }, () => {
      setFont(ctx, { weight: 800, size: 40 }); ctx.fillStyle = A; ctx.textAlign = 'center'; ctx.fillText(cfg.url, 360, 1158);
    });
  }

  function draw(ctx, t) {
    // background
    ctx.fillStyle = '#0b0d12'; ctx.fillRect(0, 0, 720, 1280);
    ctx.save(); ctx.translate(360, 1408); ctx.scale(1, 0.95);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 800);
    g.addColorStop(0, 'rgba(255,90,54,.28)'); g.addColorStop(0.6, 'rgba(255,90,54,0)');
    ctx.fillStyle = g; ctx.fillRect(-360, -1408, 720, 1280 * 1.1 + 128); ctx.restore();
    withMotion(ctx, { alpha: seg(t, 0, 0.5) * (1 - seg(t, 12.6, 13.0)) }, () => {
      setFont(ctx, { weight: 800, size: 30, spacing: 3 }); ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(cfg.brand, 50, 88);
    });
    sceneA(ctx, t);
    phone(ctx, t);
    close(ctx, t);
  }

  return { duration: DURATION, draw, config: cfg };
}

/** How each speaking role should sound. A text-to-speech adapter maps these to its own voices. */
const ROLES = {
  narrator: 'Calm, confident and friendly, like an experienced small-business owner talking to a friend. Natural pace.',
  customer: 'Casual and a little tired, like someone typing a quick question late at night.',
  assistant: 'Warm, clear and helpful, like a friendly receptionist.'
};

/** "BUILD MY AI BUSINESS FREE" read aloud as a sentence. */
const spoken = text => { const t = String(text).toLowerCase().replace(/\bai\b/g, 'AI'); return t.charAt(0).toUpperCase() + t.slice(1); };

/**
 * What is said and when, so a voice can be recorded for it. Each line starts
 * at `at` seconds and has `maxSeconds` before the next thing happens, so the
 * mixer speeds a long clip up a little to fit.
 */
function narration(input) {
  const c = normalizeConfig(input);
  return [
    { id: 'open', at: 0.7, role: 'narrator', maxSeconds: 2.4, text: `It's ${c.timeLabel} ${c.timeSuffix}. ${c.business} is closed.` },
    { id: 'question', at: 4.5, role: 'customer', maxSeconds: 2.5, text: c.question },
    { id: 'answer', at: 7.4, role: 'assistant', maxSeconds: 3.0, text: c.answer },
    { id: 'saved', at: 12.1, role: 'narrator', maxSeconds: 1.5, text: `${c.leadTitle}.` },
    { id: 'close', at: 14.3, role: 'narrator', maxSeconds: 4.0, text: c.endLine },
    { id: 'cta', at: 18.4, role: 'narrator', maxSeconds: 2.0, text: `${spoken(c.cta)}.` }
  ];
}

module.exports = { createScene, normalizeConfig, narration, ROLES, DEFAULTS, DURATION };
