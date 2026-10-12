// Remembers where a visitor first came from (a blog post, a social post, an email link) so the
// signup can say which one brought them. First touch wins and it only lives in this browser.
const KEY = 'hlai_first_touch';
const clean = (value: string | null): string => (value || '').replace(/[^\w.\-/ ]/g, '').slice(0, 80);

export type FirstTouch = { source: string; medium: string; campaign: string; ref: string; landing: string; at: string };

export function captureFirstTouch(search: string = window.location.search, path: string = window.location.pathname): void {
  try {
    if (localStorage.getItem(KEY)) return;
    const params = new URLSearchParams(search);
    const source = clean(params.get('utm_source'));
    const ref = clean(params.get('ref'));
    if (!source && !ref) return;
    const touch: FirstTouch = {
      source, ref,
      medium: clean(params.get('utm_medium')),
      campaign: clean(params.get('utm_campaign')),
      landing: clean(path),
      at: new Date().toISOString()
    };
    localStorage.setItem(KEY, JSON.stringify(touch));
  } catch { /* private mode: no tracking, nothing breaks */ }
}

export function readFirstTouch(): FirstTouch | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as FirstTouch) : null;
  } catch { return null; }
}
