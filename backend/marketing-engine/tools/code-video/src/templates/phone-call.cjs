/**
 * "Phone call" explainer, about 24 seconds, vertical.
 *
 *   An opening line, then a phone rings with an unknown caller. The AI
 *   Employee answers, the conversation appears as it is spoken, an
 *   appointment is booked and a "saved" card slides in. The phone leaves and
 *   the closing headline and button arrive.
 *
 * For ideas about missed calls, phone tag and booking.
 */
const { clamp, seg, outC, outB, inOut, lerp, typed } = require('../easing.cjs');
const { fillRoundRect, strokeRoundRect, roundRectPath, wrapText, setFont, withMotion } = require('../kit.cjs');
const { BASE_DEFAULTS, cleanBase, backdrop, brandMark, hookCard, closeScene, spoken, ROLES } = require('./shared.cjs');

const DEFAULTS = {
  ...BASE_DEFAULTS,
  hook: ['Who answers', 'when you are busy?'],
  hookAccent: 'you are busy?',
  business: 'Sample Plumbing Co.',
  callerLabel: 'Unknown caller',
  answeredLabel: 'AI Employee answered',
  callerSays1: 'Hi, my kitchen sink is leaking. Can someone come tomorrow?',
  aiSays1: 'Sorry about that. I can send someone tomorrow at 9 AM or 1 PM.',
  callerSays2: '9 AM works.',
  aiSays2: 'Booked. You will get a text to confirm.',
  leadTitle: 'Lead saved to your CRM',
  leadLines: ['Kitchen sink leak', 'Booked tomorrow 9 AM', 'Confirmation text sent'],
  endHeadline: ['Never miss', 'the next call.'],
  endAccent: 'the next call.',
  endLine: 'Your AI phone answers, books it and saves the lead while you work.'
};
const LIMITS = { hookAccent: 22, business: 28, callerLabel: 22, answeredLabel: 26, callerSays1: 70, aiSays1: 80, callerSays2: 34, aiSays2: 56, leadTitle: 34 };

function normalizeConfig(input = {}) {
  const c = { ...DEFAULTS, ...Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined && v !== null)) };
  for (const [key, max] of Object.entries(LIMITS)) c[key] = String(c[key]).trim().slice(0, max);
  if (!Array.isArray(c.hook) || c.hook.length < 1 || c.hook.length > 3) throw new Error('hook must be one to three short lines');
  c.hook = c.hook.map(l => String(l).trim().slice(0, 24));
  if (!Array.isArray(c.leadLines) || c.leadLines.length < 1 || c.leadLines.length > 3) throw new Error('leadLines must be one to three short lines');
  c.leadLines = c.leadLines.map(l => String(l).trim().slice(0, 36));
  return cleanBase(c);
}

const DURATION = 24.4;
const PHONE = { x: 80, y: 120, w: 560, h: 1040, r: 64, border: 10 };
const IN = { x: PHONE.x + PHONE.border, y: PHONE.y + PHONE.border, w: PHONE.w - PHONE.border * 2, h: PHONE.h - PHONE.border * 2 };
const CLOSE_AT = 17.2;

function createScene(input) {
  const cfg = normalizeConfig(input);
  const A = cfg.accent;

  function bubble(ctx, { text, x, y, w, fill, color, radius }) {
    setFont(ctx, { weight: 500, size: 30 });
    const lh = 30 * 1.25; const lines = wrapText(ctx, text, w - 56);
    const h = 36 + lines.length * lh;
    fillRoundRect(ctx, x, y, w, h, radius, fill);
    ctx.fillStyle = color; ctx.textAlign = 'left';
    lines.forEach((line, i) => ctx.fillText(line, x + 28, y + 18 + lh * (i + 0.5) + 30 * 0.34));
    return h;
  }

  function phone(ctx, t) {
    const pIn = seg(t, 3.2, 4.0); const pOut = seg(t, 16.2, 17.0);
    const answered = t >= 5.6;
    withMotion(ctx, { alpha: 1, dy: (1 - outC(pIn)) * 1300 + inOut(pOut) * -1500, scale: lerp(0.96, 1, outC(pIn)), cx: 360, cy: PHONE.y + PHONE.h / 2 }, () => {
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 80; ctx.shadowOffsetY = 30;
      fillRoundRect(ctx, PHONE.x, PHONE.y, PHONE.w, PHONE.h, PHONE.r, '#11141b'); ctx.restore();
      strokeRoundRect(ctx, PHONE.x, PHONE.y, PHONE.w, PHONE.h, PHONE.r, '#2a2d36', PHONE.border);
      ctx.save(); roundRectPath(ctx, IN.x, IN.y, IN.w, IN.h, PHONE.r - PHONE.border); ctx.clip(); ctx.translate(IN.x, IN.y);

      // header: the business line, then the call status
      ctx.fillStyle = '#181c25'; ctx.fillRect(0, 0, 540, 150);
      ctx.fillStyle = '#242936'; ctx.fillRect(0, 149, 540, 1);
      setFont(ctx, { weight: 600, size: 22, spacing: 2 }); ctx.fillStyle = '#8b92a1'; ctx.textAlign = 'center'; ctx.fillText((cfg.business + ' · AI PHONE LINE').toUpperCase().slice(0, 40), 270, 44);
      if (!answered) {
        setFont(ctx, { weight: 800, size: 40 }); ctx.fillStyle = '#fff'; ctx.fillText('Incoming call', 270, 98);
        setFont(ctx, { weight: 400, size: 26 }); ctx.fillStyle = '#8b92a1'; ctx.fillText(cfg.callerLabel, 270, 134);
      } else {
        const secs = Math.floor(Math.max(0, t - 5.6) * 1.0);
        withMotion(ctx, { alpha: seg(t, 5.6, 5.9), scale: lerp(0.9, 1, outB(seg(t, 5.6, 6.0))), cx: 270, cy: 78 }, () => {
          fillRoundRect(ctx, 80, 52, 380, 52, 26, '#0f2a1d'); strokeRoundRect(ctx, 80, 52, 380, 52, 26, '#2fd47a', 2);
          ctx.fillStyle = '#2fd47a'; ctx.beginPath(); ctx.arc(116, 78, 7, 0, Math.PI * 2); ctx.fill();
          setFont(ctx, { weight: 700, size: 24 }); ctx.textAlign = 'left'; ctx.fillText(cfg.answeredLabel, 136, 87);
        });
        setFont(ctx, { weight: 500, size: 24 }); ctx.fillStyle = '#8b92a1'; ctx.textAlign = 'center';
        const ended = t >= 15.7;
        ctx.fillText(`${ended ? 'Call ended' : 'On the call'} · 0:${String(Math.min(secs, 59)).padStart(2, '0')}`, 270, 132);
      }

      // ringing: avatar and rings
      if (!answered) {
        const shake = Math.sin(t * 30) * 3 * seg(t, 4.0, 4.3);
        for (let r = 0; r < 3; r += 1) {
          const p = ((t * 0.8 + r / 3) % 1);
          ctx.strokeStyle = `rgba(255,90,54,${(1 - p) * 0.6})`; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.arc(270, 520, 70 + p * 150, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.save(); ctx.translate(270 + shake, 520);
        ctx.fillStyle = '#2d3340'; ctx.beginPath(); ctx.arc(0, 0, 78, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#8b92a1'; ctx.beginPath(); ctx.arc(0, -16, 26, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(0, 46, 40, Math.PI, 0); ctx.fill(); ctx.restore();
      }

      // the conversation
      const bubbles = [
        { from: 6.2, to: 7.8, text: cfg.callerSays1, who: 'caller', y: 190 },
        { from: 8.2, to: 10.4, text: cfg.aiSays1, who: 'ai' },
        { from: 10.9, to: 11.8, text: cfg.callerSays2, who: 'caller' },
        { from: 12.3, to: 14.0, text: cfg.aiSays2, who: 'ai' }
      ];
      let y = 172;
      for (const b of bubbles) {
        const text = typed(b.text, seg(t, b.from, b.to));
        if (!text.length) break;
        const w = b.who === 'caller' ? 420 : 460;
        const x = b.who === 'caller' ? 540 - 28 - w : 28;
        const radius = b.who === 'caller' ? [30, 30, 8, 30] : [30, 30, 30, 8];
        // height is of the full text, so later bubbles do not jump as it types
        setFont(ctx, { weight: 500, size: 30 });
        const fullLines = wrapText(ctx, b.text, w - 56).length;
        const fullH = 36 + fullLines * 37.5;
        bubble(ctx, { text, x, y, w, fill: b.who === 'caller' ? '#2d3340' : '#fff', color: b.who === 'caller' ? '#fff' : '#11141b', radius });
        y += fullH + 18;
      }
      // saved card
      const leadP = seg(t, 14.5, 15.2);
      withMotion(ctx, { alpha: leadP, dy: (1 - outC(leadP)) * 40, scale: lerp(0.96, 1, outB(leadP)), cx: 270, cy: 880 }, () => {
        const h = 24 + 34 + 10 + cfg.leadLines.length * 39 + 24; const top = 1020 - 30 - h;
        fillRoundRect(ctx, 28, top, 484, h, 28, '#0f2a1d'); strokeRoundRect(ctx, 28, top, 484, h, 28, '#2fd47a', 2);
        ctx.strokeStyle = '#2fd47a'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(56, top + 38); ctx.lineTo(63, top + 46); ctx.lineTo(76, top + 28); ctx.stroke();
        setFont(ctx, { weight: 700, size: 28 }); ctx.fillStyle = '#2fd47a'; ctx.textAlign = 'left'; ctx.fillText(cfg.leadTitle, 86, top + 46);
        setFont(ctx, { weight: 400, size: 26 }); ctx.fillStyle = '#d9f5e6';
        cfg.leadLines.forEach((line, i) => ctx.fillText(line, 56, top + 24 + 34 + 10 + 29 + i * 39));
      });
      ctx.restore();
    });
    withMotion(ctx, { alpha: seg(t, 3.8, 4.2) * (1 - seg(t, 16.0, 16.4)) }, () => {
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
  return [
    { id: 'open', at: 0.6, role: 'narrator', maxSeconds: 2.4, text: c.hook.join(' ') },
    { id: 'caller1', at: 6.3, role: 'customer', maxSeconds: 2.0, text: c.callerSays1 },
    { id: 'ai1', at: 8.3, role: 'assistant', maxSeconds: 2.5, text: c.aiSays1 },
    { id: 'caller2', at: 10.9, role: 'customer', maxSeconds: 1.2, text: c.callerSays2 },
    { id: 'ai2', at: 12.4, role: 'assistant', maxSeconds: 2.0, text: c.aiSays2 },
    { id: 'saved', at: 14.7, role: 'narrator', maxSeconds: 1.6, text: `${c.leadTitle}.` },
    { id: 'close', at: CLOSE_AT + 0.9, role: 'narrator', maxSeconds: 3.6, text: c.endLine },
    { id: 'cta', at: CLOSE_AT + 4.6, role: 'narrator', maxSeconds: 2.0, text: `${spoken(c.cta)}.` }
  ];
}

module.exports = { createScene, normalizeConfig, narration, ROLES, DEFAULTS, DURATION };
