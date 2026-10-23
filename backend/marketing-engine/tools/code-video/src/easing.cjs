/** Small timing helpers. A scene is a function of time, so everything is built from these. */
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
/** 0 before `a`, 1 after `b`, a straight ramp between. */
const seg = (t, a, b) => clamp((t - a) / (b - a));
const outC = p => 1 - Math.pow(1 - p, 3);
/** Overshoots a little and settles, for things that pop in. */
const outB = p => { const c1 = 1.5; const c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
const inOut = p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const lerp = (a, b, p) => a + (b - a) * p;
/** The first part of a string, for typing effects. */
const typed = (text, p) => text.slice(0, Math.floor(text.length * p));

module.exports = { clamp, seg, outC, outB, inOut, lerp, typed };
