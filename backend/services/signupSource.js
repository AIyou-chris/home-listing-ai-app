'use strict';
// First-touch tracking sent by the browser at signup. Only short, plain strings are kept.
const clean = (v) => String(v || '').replace(/[^\w.\-/ ]/g, '').slice(0, 80);

function cleanFirstTouch(input) {
  if (!input || typeof input !== 'object') return null;
  const touch = {
    source: clean(input.source), medium: clean(input.medium), campaign: clean(input.campaign),
    ref: clean(input.ref), landing: clean(input.landing), at: clean(String(input.at || '').replace(/:/g, '-'))
  };
  if (!touch.source && !touch.ref) return null;
  return touch;
}

const describe = (touch) => (touch ? [touch.source || touch.ref, touch.medium, touch.campaign].filter(Boolean).join(' / ') : 'direct or unknown');

module.exports = { cleanFirstTouch, describe };
