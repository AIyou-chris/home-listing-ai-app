// Own, cookie-free site analytics. Sends the page path (no query/hash) and a random browser id. Never throws.
const KEY = 'hlai_vid'

const visitorId = (): string => {
  try {
    let id = window.localStorage.getItem(KEY)
    if (!id) {
      id = (window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`)
      window.localStorage.setItem(KEY, id)
    }
    return id
  } catch {
    return ''
  }
}

const send = (payload: Record<string, string>) => {
  try {
    const body = JSON.stringify({ ...payload, vid: visitorId() })
    if (navigator.sendBeacon && navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }))) return
    void fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => undefined)
  } catch {
    /* tracking must never break the page */
  }
}

let lastView = ''
export const trackView = (path: string) => {
  if (path === lastView) return
  const first = lastView === ''
  lastView = path
  send({ type: 'view', path, ref: first ? document.referrer : '' })
}

export const trackClick = (path: string, label: string) => {
  if (label) send({ type: 'click', path, label })
}

// Label for whatever was clicked: data-track wins, else the button/link text.
export const clickLabel = (target: EventTarget | null): string => {
  const el = (target as Element | null)?.closest?.('a,button,[data-track]') as HTMLElement | null
  if (!el) return ''
  const raw = el.getAttribute('data-track') || el.getAttribute('aria-label') || el.textContent || ''
  return raw.replace(/\s+/g, ' ').trim().slice(0, 60)
}
